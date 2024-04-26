const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
import { ethers, network } from "hardhat";


async function randomBidGenerator(fundGenerator, auction, minBid, maxBid, bidCount) {
    const min = parseFloat(minBid);
    const max = parseFloat(maxBid);
    
    let bidders: { [key: string]: any } = {};
    let addresses = [];

    let bidSum = BigInt(0);

    for (let i=0;i<bidCount;i++) {
        const randomAddress = ethers.Wallet.createRandom();
        const connectedWallet = randomAddress.connect(ethers.provider);
        
        const transaction = await fundGenerator.sendTransaction({
            to: connectedWallet.address,
            value: ethers.parseEther("2.0"),
        });
        
        const randomValue = (Math.random() * (max - min) + min).toString();
        await auction.connect(connectedWallet).bid({value: ethers.parseEther(randomValue)});

        bidders[connectedWallet.address] = {
            'address': connectedWallet,
            'bid': ethers.parseEther(randomValue),
            'bidString': randomValue
        }
        addresses.push(connectedWallet.address);
        bidSum += ethers.parseEther(randomValue);
    }

    return {bidders, bidSum, addresses};
}

async function randomIncreaseGenerator(bidders, bidSum, auction, maxIncreaseCount, minIncreaseAmount, maxIncreaseAmount) {
    const minIncreaseFloat = parseFloat(minIncreaseAmount);
    const maxIncreaseFloat = parseFloat(maxIncreaseAmount);

    for (let addressString in bidders) {
        const increaseCount = Math.round(Math.random() * maxIncreaseCount);
        for (let i = 0; i<increaseCount; i++) {
            const increaseAmount = (Math.random() * (maxIncreaseFloat - minIncreaseFloat) + minIncreaseFloat).toString();
            const increaseAmountWei = ethers.parseEther(increaseAmount);
            await auction.connect(bidders[addressString].address).increaseBid({value: increaseAmountWei});
            bidders[addressString].bid += increaseAmountWei;
            bidders[addressString].bidString += ethers.formatEther(bidders[addressString].bid);
            bidSum += increaseAmountWei;
        }
    }
    return {bidders, bidSum};
}

describe ("random bid & increasing bid multiple times..", function() {
    this.timeout(120000);
    async function deployTokenFixture() {

        const totalBidders = 50;
        const totalNFTAuctioned = 12;

        const Mystery = await ethers.getContractFactory("ERC721LazyMintWith712SignatureChecker");
        const Auction = await ethers.getContractFactory("RaffleAuctionMinter");
        const [owner, recipient, admin1, admin2, fundGenerator, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();
        
        const mystery = await Mystery.deploy('MysteryName', 'MYST', recipient.address, "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu");
        await mystery.waitForDeployment();

        const auctionEndTime = Math.round(new Date().getTime() / 1000) + 5000000;
        const mysteryContractAddress = await mystery.getAddress();
        const reservePrice = "0.4";
        const highestBidPrice = "1.5";
        const minBidIncrement = "0.01";

        const auction = await Auction.deploy(
            mysteryContractAddress,
            recipient.address,
            totalNFTAuctioned,
            ethers.parseEther(reservePrice),
            ethers.parseEther(highestBidPrice),
            ethers.parseEther(minBidIncrement),
            auctionEndTime
        );
        await auction.waitForDeployment();

        const auctionContractAddress = await auction.getAddress();

        await mystery.grantRole(mystery.MINTER_ROLE(), auctionContractAddress);

        // let {bidders, bidSum, addresses} = await randomBidGenerator(fundGenerator, auction, reservePrice, highestBidPrice, totalBidders);
        let {bidders, bidSum, addresses} = await randomBidGenerator(fundGenerator, auction, "0.5", "0.8", totalBidders);
        ({bidders, bidSum} = await randomIncreaseGenerator(bidders, bidSum, auction, 5, minBidIncrement, "0.1"));

        
        // get winners and losers
        let claimInfos: { [key: string]: any } = {};
        let winners: { [key: string]: any } = {};
        let losers: { [key: string]: any } = {};
        for (const address of addresses) {
            claimInfos[address] = await auction.claimInfo(address);
            if (claimInfos[address].mintNft) {
                winners[address] = claimInfos[address];
            }
            else {
                losers[address] = claimInfos[address];
            }
        }

        return {auction, owner, recipient, addr1 ,addr2, addr3, bidders, highestBidPrice, bidSum, totalBidders, totalNFTAuctioned, claimInfos, winners, losers, mystery, auctionContractAddress};
    }
    it("contract balance equal with sum of total user's bid", async function() {
        const { auction, bidSum, auctionContractAddress } = await loadFixture(deployTokenFixture);

        const auctionBalance = await auction.tvl();
        expect(auctionBalance).to.be.equal(bidSum);

        const addressBalance = await ethers.provider.getBalance(auctionContractAddress);
        expect(addressBalance).to.be.equal(bidSum);
    });
    it("total bids count equal to number of bidders", async function() {
        const { auction, bidders } = await loadFixture(deployTokenFixture);

        const bidderCount = await auction.getTotalBidsCnt();
        expect(bidderCount).to.be.equal(Object.keys(bidders).length);
    });
    it("winners and losers count should be correct as expected", async function() {
        const { winners, losers, totalNFTAuctioned, bidders } = await loadFixture(deployTokenFixture);

        const expectedWinnerCount = Math.min(totalNFTAuctioned, Object.keys(bidders).length);
        const expectedLoserCount = Math.max(0, Object.keys(bidders).length - totalNFTAuctioned);

        expect(Object.keys(winners).length).to.be.equal(expectedWinnerCount);
        expect(Object.keys(losers).length).to.be.equal(expectedLoserCount);
    });
    it("winners not eligible to refund the difference between bid and winner floorbid", async function() {
        const { auction, winners, bidders } = await loadFixture(deployTokenFixture);

        for (let addressString in winners) {
            expect(winners[addressString].refundAmount).to.be.equal(0);
        }
    });
    it("losers eligible to refund full amount", async function() {
        const { auction, losers, bidders } = await loadFixture(deployTokenFixture);

        for (let addressString in losers) {
            expect(losers[addressString].refundAmount).to.be.equal(bidders[addressString].bid);
        }        
    });
    it("winners can claim, gets nft and partial refund", async function() {
        const { auction, winners, bidders, mystery } = await loadFixture(deployTokenFixture);

        // Increase the time
        const increaseTime = 5000000;
        await network.provider.send("evm_increaseTime", [increaseTime]);
        // Mine a new block for the time change to take effect
        await network.provider.send("evm_mine");


        for (let addressString in winners) {
            const winnerAddress = bidders[addressString].address;

            expect(await mystery.balanceOf(addressString)).to.be.equal(0);
            const initialBalance =  await ethers.provider.getBalance(winnerAddress);
            

            // claim process
            const claimTx = await auction.connect(winnerAddress).claimAndRefund();
            const receipt = await claimTx.wait();
            const gasUsed = receipt.gasUsed;
            
            const txDetails = await ethers.provider.getTransaction(claimTx.hash);
            await txDetails.wait();
            const gasPrice = txDetails.gasPrice;

            expect(await mystery.balanceOf(winnerAddress.address)).to.be.equal(1);
            
            const afterClaimBalance =  await ethers.provider.getBalance(winnerAddress);
            expect(afterClaimBalance - initialBalance).to.be.equal(winners[addressString].refundAmount - ( gasUsed * gasPrice));
        }
    });
    it("losers can claim, gets gets full refund and does not get NFT token", async function() {
        const { auction, losers, bidders, mystery } = await loadFixture(deployTokenFixture);

        // Increase the time
        const increaseTime = 5000000;
        await network.provider.send("evm_increaseTime", [increaseTime]);
        // Mine a new block for the time change to take effect
        await network.provider.send("evm_mine");


        for (let addressString in losers) {
            const loserAddress = bidders[addressString].address;

            expect(await mystery.balanceOf(addressString)).to.be.equal(0);
            const initialBalance =  await ethers.provider.getBalance(loserAddress);
            

            // claim process
            const claimTx = await auction.connect(loserAddress).claimAndRefund();
            const receipt = await claimTx.wait();
            const gasUsed = receipt.gasUsed;
            
            const txDetails = await ethers.provider.getTransaction(claimTx.hash);
            await txDetails.wait();
            const gasPrice = txDetails.gasPrice;

            expect(await mystery.balanceOf(addressString)).to.be.equal(0);
            
            const afterClaimBalance =  await ethers.provider.getBalance(loserAddress);
            expect(afterClaimBalance - initialBalance).to.be.equal(losers[addressString].refundAmount - ( gasUsed * gasPrice));
        }
    });
    it("non-participant cannot claim anything", async function() {
        const { auction, mystery, addr1, addr2 } = await loadFixture(deployTokenFixture);

        // Increase the time
        const increaseTime = 5000000;
        await network.provider.send("evm_increaseTime", [increaseTime]);
        // Mine a new block for the time change to take effect
        await network.provider.send("evm_mine");

        await expect(auction.connect(addr1).claimAndRefund()).to.be.reverted;
        await expect(auction.connect(addr2).claimAndRefund()).to.be.reverted;

        expect(await mystery.balanceOf(addr1)).to.be.equal(0);
        expect(await mystery.balanceOf(addr2)).to.be.equal(0);
        
    });
    it("all participants can not claim more than once", async function() {
        const { auction, bidders, auctionContractAddress, winners, recipient } = await loadFixture(deployTokenFixture);

        // Increase the time
        const increaseTime = 5000000;
        await network.provider.send("evm_increaseTime", [increaseTime]);
        // Mine a new block for the time change to take effect
        await network.provider.send("evm_mine");

        for (let addressString in bidders) {
            const loserAddress = bidders[addressString].address;
            await expect(auction.connect(bidders[addressString].address).claimAndRefund()).to.not.be.reverted;
            await expect(auction.connect(bidders[addressString].address).claimAndRefund()).to.be.reverted;
        }
    });
    it("after all participant claim and refund, admin can withdraw right amount of fund to recipient wallet address", async function() {
        const { auction, bidders, auctionContractAddress, winners, recipient } = await loadFixture(deployTokenFixture);

        // Increase the time
        const increaseTime = 5000000;
        await network.provider.send("evm_increaseTime", [increaseTime]);
        // Mine a new block for the time change to take effect
        await network.provider.send("evm_mine");

        for (let addressString in bidders) {
            const loserAddress = bidders[addressString].address;
            const claimTx = await auction.connect(bidders[addressString].address).claimAndRefund();
            await claimTx.wait();
        }
        var totalAmount = BigInt(0)
        for (let address in winners) {
            const bid = bidders[address].bid
            totalAmount = totalAmount + bid
        }

        const auctionContractBalance =  await ethers.provider.getBalance(auctionContractAddress);
        const auctionTvl = await auction.tvl();

        expect(auctionContractBalance).to.be.equal(totalAmount);
        expect(auctionTvl).to.be.equal(totalAmount);

        const initialBalance =  await ethers.provider.getBalance(recipient.address);
        await expect(auction.sendPayment()).to.not.be.reverted;
        const afterWithdrawBalance =  await ethers.provider.getBalance(recipient.address);

        expect(afterWithdrawBalance - initialBalance).to.be.equal(totalAmount);
    });
});