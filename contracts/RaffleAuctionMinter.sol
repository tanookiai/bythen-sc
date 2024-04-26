// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./RaffleBidHeap.sol";
import "@thirdweb-dev/contracts/extension/Permissions.sol";
import "@thirdweb-dev/contracts/extension/interface/IPermissions.sol";
import "@thirdweb-dev/contracts/extension/PermissionsEnumerable.sol";
import "@thirdweb-dev/contracts/external-deps/openzeppelin/utils/cryptography/ECDSA.sol";
import "./interfaces/ISignatureMintERC721.sol";
import "hardhat/console.sol";
import "@thirdweb-dev/contracts/extension/PrimarySale.sol";
import "@thirdweb-dev/contracts/external-deps/openzeppelin/security/ReentrancyGuard.sol";


error InvalidPrice();
error BidIncrementTooLow();
error BidAlreadyPlaced();
error BidNotPlaced();
error AuctionEnded();
error AuctionStillLive();
error LastAdminRemoval();

contract RaffleAuctionMinter is RaffleBidHeap, PermissionsEnumerable, PrimarySale, ReentrancyGuard {

    struct ClaimInfo {
        bool hasClaimed;
        uint256 refundAmount;
        bool mintNft;
    }

    event BidPlaced(address indexed buyer, uint256 bidPrice);
    event BidIncrement(address indexed buyer, uint256 newbidPrice, uint256 bidIncrease);
    event Claim(address indexed buyer, uint256 refundAmount, bool nftMinted);

    address public nftAddress;
    uint256 public auctionEndTime;
    // The minimum price accepted in an auction
    uint256 public reservePrice;
    uint256 public highestBidPrice;
    bool public paymentSent;
    // The minimum amount a user needs to submit for a stacked bid
    uint256 public minStackedBidIncrement;
    // The tokenId of the next token to be minted.
    uint256 internal numerBids = 0;

    mapping(address => bool) public hasClaimed;


    constructor(
        address _nftAddress,
        address _paymentRecipient,
        uint256 _maxPublicNFTs, //TODO - should this be updateable?
        uint256 _reservePrice,
        uint256 _highestBidPrice,
        uint256 _minStackedBidIncrement,
        uint256 _auctionEndTime
    ) RaffleBidHeap(_maxPublicNFTs) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setRoleAdmin(DEFAULT_ADMIN_ROLE, DEFAULT_ADMIN_ROLE);

        reservePrice = _reservePrice;
        highestBidPrice = _highestBidPrice;
        nftAddress = _nftAddress;
        auctionEndTime = _auctionEndTime;
        minStackedBidIncrement = _minStackedBidIncrement;
        _setupPrimarySaleRecipient(_paymentRecipient);

    }

    receive() external payable {}

    /**************** Management Functions ****************/
    function sendPayment() external onlyRole(DEFAULT_ADMIN_ROLE) {
        //TODO - review this thoroughly. Could be dangerous if auctionEndTime is not set properly
        if(block.timestamp < auctionEndTime)
            revert AuctionStillLive();
        require(!paymentSent, "RaffleAuctionMinter: payment already sent");
        uint256 totalValue = 0;
        for (uint256 i = 0; i < size(); i++) {
            totalValue = totalValue + getWinner(i).price;
        }
        (bool success, ) = primarySaleRecipient().call{value: totalValue}("");
        require(success, "RaffleAuctionMinter: failed to send payment");
        paymentSent = true;
    }


    function _canSetPrimarySaleRecipient() internal view virtual override(PrimarySale) returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function setNftAddress(address _addr) external onlyRole(DEFAULT_ADMIN_ROLE) {
        nftAddress = _addr;
    }

    function setAuctionEndTime(uint256 _t) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // console.log("Block time stamp %s", block.timestamp);
        require(_t > block.timestamp, "RaffleAuctionMinter: invalid timestamp");
        require(block.timestamp <= auctionEndTime, "RaffleAuctionMinter: already ended");
        auctionEndTime = _t;
    }

    function setMinReplacementIncrease(uint256 _minStackedBidIncrement) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minStackedBidIncrement = _minStackedBidIncrement;
    }

    function setReservePrice(uint256 _reservePrice) external onlyRole(DEFAULT_ADMIN_ROLE) {
        reservePrice = _reservePrice;
    }

    function setHighestBidPrice(uint256 _highestBidPrice) external onlyRole(DEFAULT_ADMIN_ROLE) {
        highestBidPrice = _highestBidPrice;
    }

    function revokeRole(bytes32 role, address account) public virtual override(Permissions, IPermissions) {
        super.revokeRole(role, account);
        if (role == DEFAULT_ADMIN_ROLE && this.getRoleMemberCount(role) <= 0) {
            revert LastAdminRemoval();
        }
    }

    function renounceRole(bytes32 role, address account) public virtual override(Permissions, IPermissions) {
        super.renounceRole(role, account);
        if (role == DEFAULT_ADMIN_ROLE && this.getRoleMemberCount(role) <= 0) {
            revert LastAdminRemoval();
        }
    }

    function bid() external payable {
        // console.log("Sender %s is bidding %s", msg.sender, msg.value);

        // Check signature validity
        if(block.timestamp > auctionEndTime) {
            revert AuctionEnded();
        }

        if (msg.value < reservePrice || msg.value == 0 || msg.value > highestBidPrice) {
            revert InvalidPrice();
        }

        if(userBids[msg.sender].price > 0) { //TODO - is this correct approach for null/existence check
            revert BidAlreadyPlaced();
        }
        else {
            RaffleBidHeap.Bid memory newBid = RaffleBidHeap.Bid(
                msg.sender,
                uint128(msg.value),
                uint64(block.timestamp),
                false
            );
            tryInsert(newBid);
            // debugIndexHeapVsUserBids();
            numerBids++;
            // console.log("Total bids: %s", numerBids);
            emit BidPlaced(msg.sender, userBids[msg.sender].price);
        }
    }

    function increaseBid() external payable {
        if(block.timestamp > auctionEndTime) {
            revert AuctionEnded();
        }

        if (msg.value < minStackedBidIncrement || msg.value == 0) {
            revert BidIncrementTooLow();
        }

        RaffleBidHeap.Bid storage existinglBid = userBids[msg.sender]; //this will create a reference to storage

        if(existinglBid.price > 0) {
            if (existinglBid.price + msg.value > highestBidPrice) {
                revert InvalidPrice();
            }
            // console.log("existing bid is %s", existinglBid.price);
            existinglBid.price += uint128(msg.value);
            if(existinglBid.inHeap == false) {
                // console.log("increasing bid by %s, new bid %s", msg.value, existinglBid.price);
                tryInsert(existinglBid);
            }
            else {
                //TODO - test
                heapifyDown(msg.sender);
            }
            emit BidIncrement(msg.sender, existinglBid.price, msg.value);
        }
        else {
            revert BidNotPlaced();
        }
    }

    function claimInfo(address _a) public view returns (ClaimInfo memory info) {
        info.hasClaimed = hasClaimed[_a];
        info.refundAmount = 0;
        info.mintNft = false;
        if(userBids[_a].price == 0) {
            revert BidNotPlaced();
        }
        if (userBids[_a].inHeap == true) {
            info.mintNft = true;
        } else {
            info.refundAmount = userBids[_a].price;
        }
    }

    //TODO - add test that user without bid can't claimAndRefund
    //TODO - Function looks re-entrant safe. Test the gas. In case gas usage is high, consider removing nonReentrant

    function claimAndRefund() external nonReentrant {
        require(
            block.timestamp > auctionEndTime,
            "RaffleAuctionMinter: No claims or refunds allowed until auction ends"
        );
        ClaimInfo memory info = claimInfo(msg.sender);

        require(!info.hasClaimed, "RaffleAuctionMinter: has claimed");
        require(
            info.mintNft || info.refundAmount > 0,
            "RaffleAuctionMinter: nothing to claim"
        );

        hasClaimed[msg.sender] = true;

        if (info.mintNft) {
            ISignatureMintERC721(nftAddress).mint(msg.sender);
        }
        
        if (info.refundAmount > 0) {
            (bool success, ) = msg.sender.call{value: info.refundAmount}("");
            require(success, "RaffleAuctionMinter: failed to send refund");
        }

        emit Claim(msg.sender, info.refundAmount, info.mintNft);
    }

    /**************** View Functions ****************/
    function tvl() external view returns (uint256) {
        return address(this).balance;
    }

    function floorBid() external view returns (RaffleBidHeap.Bid memory) {
        // console.log("min bid is %s", _heap.minBid());
        return minBid();
    }

    function getUserClaimInfos(
        address[] calldata _addresses
    ) external view returns (ClaimInfo[] memory results) {
        results = new ClaimInfo[](_addresses.length);
        for (uint256 i = 0; i < _addresses.length; i++) {
            results[i] = claimInfo(_addresses[i]);
        }
    }

    function getUserBids(
        address[] calldata _addresses
    ) external view returns (RaffleBidHeap.Bid[] memory bids) {
        bids = new RaffleBidHeap.Bid[](_addresses.length);
        for (uint256 i = 0; i < _addresses.length; i++) {
            bids[i] = userBids[_addresses[i]];
        }
    }

    function getTotalBidsCnt() external view returns (uint256) {
        return numerBids;
    }

    function getBidAmtByBuyerId(
        address _buyer
    ) external view returns (uint256) {
        return userBids[_buyer].price;
    }

    function claimWinners() external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            block.timestamp > auctionEndTime,
            "RaffleAuctionMinter: No claims or refunds allowed until auction ends"
        );

        for (uint256 i = 0; i < size(); i++) {
            Bid memory winner = getWinner(i);
            bool isHasClaimed = hasClaimed[winner.bidder];
            if (!isHasClaimed) {
                ClaimInfo memory info = claimInfo(winner.bidder);

                require(
                    info.mintNft,
                    "RaffleAuctionMinter: nothing to claim"
                );

                hasClaimed[winner.bidder] = true;

                if (info.mintNft) {
                    ISignatureMintERC721(nftAddress).mint(winner.bidder);
                }
            }
        }
    }

}
