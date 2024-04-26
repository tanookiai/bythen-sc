const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
import { ethers, network } from "hardhat";


describe ("after auction contract initialized", function() {
    async function deployTokenFixture() {
        const Mystery = await ethers.getContractFactory("ERC721LazyMintWith712SignatureChecker");
        const Auction = await ethers.getContractFactory("RaffleAuctionMinter");
        const [owner, recipient, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8] = await ethers.getSigners();
        const mystery = await Mystery.deploy('MysteryName', 'MYST', recipient.address, "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu");
        await mystery.waitForDeployment();

        const auctionEndTime = Math.round(new Date().getTime() / 1000) + 5000;
        const mysteryContractAddress = await mystery.getAddress();
        const reservePrice = ethers.parseEther("0.111");
        const highestBidPrice = ethers.parseEther("0.555");
        const minBidIncrement = ethers.parseEther("0.0222");

        const auction = await Auction.deploy(
            mysteryContractAddress,
            recipient.address,
            1688,
            reservePrice,
            highestBidPrice,
            minBidIncrement,
            auctionEndTime
        );
        await auction.waitForDeployment();

        return {mystery, auction, owner, recipient, auctionEndTime, mysteryContractAddress, reservePrice, highestBidPrice, minBidIncrement ,addr1 };
    }
    it("sets the right contract address for the nft being auctioned", async function() {
        const { auction, mysteryContractAddress } = await loadFixture(deployTokenFixture);
        expect(await auction.nftAddress()).to.be.equal(mysteryContractAddress);
    });
    it("sets the right primary sale recipient", async function() {
        const { auction, recipient } = await loadFixture(deployTokenFixture);
        expect(await auction.primarySaleRecipient()).to.be.equal(recipient.address);
    });
    it("sets the right reserve price (min bid)", async function() {
        const { auction, reservePrice } = await loadFixture(deployTokenFixture);
        expect(await auction.reservePrice()).to.be.equal(reservePrice);
    });
    it("sets the right highestBidPrice (max bid)", async function() {
        const { auction, highestBidPrice } = await loadFixture(deployTokenFixture);
        expect(await auction.highestBidPrice()).to.be.equal(highestBidPrice);
    });
    it("sets the right auction end time)", async function() {
        const { auction, auctionEndTime } = await loadFixture(deployTokenFixture);
        expect(await auction.auctionEndTime()).to.be.equal(auctionEndTime);
    });
    it("sets the right minimum bid increment (minStackedBidIncrement)", async function() {
        const { auction, minBidIncrement } = await loadFixture(deployTokenFixture);
        expect(await auction.minStackedBidIncrement()).to.be.equal(minBidIncrement);
    });
    it("sets the paymentFlag to false", async function() {
        const { auction } = await loadFixture(deployTokenFixture);
        expect(await auction.paymentSent()).to.be.equal(false);
    });
})
