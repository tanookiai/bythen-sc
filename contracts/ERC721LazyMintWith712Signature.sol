// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

//TODO -
//1. review internal vs external - external can save cost - Done
//2. review calldata. Any function argument not modified, mark it as calldata
//3. review view vs pure - Done
//5. Everyone to share same artwork
//6. Mint the real NFTs on IPFS/NFT stograge and verify who can modity the metadata
//7. Do we need a Proxy contract? (Impact on gas)
//8. Impact of proxy on constructor execution of this smart contract - will it be ok to have constructor. Will need a initilizer
//9. Make all revert event based - Done

import "@thirdweb-dev/contracts/extension/PrimarySale.sol";
import "@thirdweb-dev/contracts/extension/Permissions.sol";
import "@thirdweb-dev/contracts/extension/interface/IPermissions.sol";
import "@thirdweb-dev/contracts/extension/PermissionsEnumerable.sol";
import "./interfaces/ISignatureMintERC721.sol";
import "@thirdweb-dev/contracts/eip/ERC721A.sol";
import "@thirdweb-dev/contracts/external-deps/openzeppelin/utils/cryptography/EIP712.sol";
import "@thirdweb-dev/contracts/external-deps/openzeppelin/utils/cryptography/ECDSA.sol";
import "@thirdweb-dev/contracts/external-deps/openzeppelin/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

error NotAllowedToListBurn();
error InvalidRequest(string);
error RequestExpired();
error ExceededMaxSupply();
error FailedToCollectPayment();
error LastAdminRemoval();

    contract ERC721LazyMintWith712SignatureChecker is ISignatureMintERC721, ERC721A, EIP712, ReentrancyGuard, PermissionsEnumerable, PrimarySale {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 private constant TYPEHASH =
        keccak256("MintRequest(address to,uint256 quantity,uint256 pricePerToken,uint256 validityStartTimestamp,uint256 validityEndTimestamp,bytes32 uid)");
    mapping(bytes32 => bool) private minted;
    bool public isAllowedToListorBurn = false;
    uint256 public maxTotalSupply = 1888; // Maximum total supply limit
    string private collectionURI;

    constructor(string memory name, string memory symbol, address _primarySaleRecipient, string memory _collectionURI)
    ERC721A(name, symbol)
    EIP712(name, "1.0.0")
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
        _setRoleAdmin(DEFAULT_ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(MINTER_ROLE, DEFAULT_ADMIN_ROLE);
        _setupPrimarySaleRecipient(_primarySaleRecipient);
        console.log("sender address: %s", _msgSender());
        collectionURI = _collectionURI;
    }

     function tokenURI(uint256 tokenId) public view virtual override(ERC721A) returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        return collectionURI;
    }

    function _canSetPrimarySaleRecipient() internal view virtual override(PrimarySale) returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721A) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    modifier allowedToListorBurn() {
        if (!isAllowedToListorBurn) {
            revert NotAllowedToListBurn();
        }
        _;
    }

    function setAllowedToListorBurn(bool value) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isAllowedToListorBurn = value;
    }

    function mintWithSignature(
        MintRequest calldata _req,
        bytes calldata _signature
    ) external payable virtual override returns (address signer) {
        if(totalSupply() + _req.quantity > maxTotalSupply) {
            revert ExceededMaxSupply();
        }

        // Verify and process payload.
        uint256 tokenIdToMint = nextTokenIdToMint();
        signer = processRequest(_req, _signature);

        address receiver = _req.to;

        // Collect price
        collectPriceOnClaim(primarySaleRecipient(), _req.quantity, _req.pricePerToken); // guys, is this the right way to get the recipient address?

        _safeMint(receiver, _req.quantity);

        emit GenesisTokensMintedWithSignature(signer, receiver, tokenIdToMint, _req);
    }

    function mint(address to) external virtual override onlyRole(MINTER_ROLE) {
        if(totalSupply() + 1 > maxTotalSupply)
            revert ExceededMaxSupply();

        uint256 tokenIdToMint = nextTokenIdToMint();
        _safeMint(to, 1);
        emit GenesisTokensMinted(to, tokenIdToMint);
    }

    function burn(uint256 tokenId) external virtual override allowedToListorBurn onlyRole(MINTER_ROLE) {
        _burn(tokenId);
        emit GenesisTokensBurned(tokenId);
    }

    function approve(address to, uint256 tokenId) public virtual override allowedToListorBurn {
        super.approve(to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) public virtual override allowedToListorBurn {
        super.setApprovalForAll(operator, approved);
    }

    function transferFrom(address from, address to, uint256 tokenId) public virtual override allowedToListorBurn {
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) public virtual override allowedToListorBurn {
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory _data) public virtual override allowedToListorBurn {
        super.safeTransferFrom(from, to, tokenId, _data);
    }

    function nextTokenIdToMint() public view virtual returns (uint256) {
        return _currentIndex;
    }

    function processRequest(MintRequest calldata req, bytes calldata signature) internal returns (address signer) {
        bool success;
        signer = ECDSA.recover(_hashTypedDataV4(keccak256(encodeRequest(req))), signature);
        success = !minted[req.uid] && hasRole(MINTER_ROLE, signer);

        if (!success) {
            revert InvalidRequest("Already Minted or signer doesn't has minter role");
        }

        if (req.validityStartTimestamp > block.timestamp || block.timestamp > req.validityEndTimestamp) {
            revert InvalidRequest("Req expired");
        }
        if(req.to == address(0)) {
            revert InvalidRequest("recipient undefined");
        }
        if(req.quantity == 0) {
            revert InvalidRequest("0 qty");
        }

        minted[req.uid] = true;
    }

    function encodeRequest(MintRequest calldata req) internal pure returns (bytes memory) {
        return
            abi.encode(
                TYPEHASH,
                req.to,
                req.quantity,
                req.pricePerToken,
                req.validityStartTimestamp,
                req.validityEndTimestamp,
                req.uid
            );
    }

    function collectPriceOnClaim(address saleRecipient, uint256 quantityToClaim, uint256 pricePerToken ) internal virtual {
        if(pricePerToken == 0) {
            revert InvalidRequest("Invalid price per token");
        }

        uint256 totalPrice = quantityToClaim * pricePerToken;

        if(msg.value != totalPrice) {
            revert InvalidRequest("Invalid msg value");
        }

        safeTransferNativeToken(saleRecipient, totalPrice);
    }

    function safeTransferNativeToken(address to, uint256 value) internal {
        // solhint-disable avoid-low-level-calls
        // slither-disable-next-line low-level-calls
        (bool success, ) = to.call{ value: value }("");
        if(!success) {
            revert FailedToCollectPayment();
        }
        
        require(success, "native token transfer failed");
    }

    function setMaxTotalSupply(uint256 _maxTotalSupply) external virtual onlyRole(DEFAULT_ADMIN_ROLE) {
        maxTotalSupply = _maxTotalSupply;
    }

    function setCollectionURI(string calldata _newURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        collectionURI = _newURI;
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
}