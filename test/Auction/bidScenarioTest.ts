const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
import { ethers } from "hardhat";


describe ("When heap is not full", function() {
    async function deployTokenFixture() {
        const Mystery = await ethers.getContractFactory("ERC721LazyMintWith712SignatureChecker");
        const Auction = await ethers.getContractFactory("RaffleAuctionMinter");
        const [owner, recipient, admin1, admin2, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();
        
        const mystery = await Mystery.deploy('MysteryName', 'MYST', recipient.address, "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu");
        await mystery.waitForDeployment();

        const auctionEndTime = Math.round(new Date().getTime() / 1000) + 5000000;
        const mysteryContractAddress = await mystery.getAddress();
        const reservePrice = ethers.parseEther("0.4");
        const highestBidPrice = ethers.parseEther("0.8");
        const minBidIncrement = ethers.parseEther("0.01");

        const auction = await Auction.deploy(
            mysteryContractAddress,
            recipient.address,
            10,
            reservePrice,
            highestBidPrice,
            minBidIncrement,
            auctionEndTime
        );
        await auction.waitForDeployment();

        let bidders = [];

        for (let i=0;i<5;i++) {
            const randomValue = (Math.random() * (0.8 - 0.4) + 0.4).toString();
            const randomAddress = ethers.Wallet.createRandom();
            const connectedWallet = randomAddress.connect(ethers.provider);
            
            const transaction = await owner.sendTransaction({
                to: connectedWallet.address,
                value: ethers.parseEther("3.0"),
            });
            
            await auction.connect(connectedWallet).bid({value: ethers.parseEther(randomValue)});

            bidders.push(
                {
                    'address': connectedWallet,
                    'bid': randomValue
                }
            )
        }


        return {auction, owner, recipient, addr1 ,addr2, addr3, bidders, highestBidPrice};
    }
    it("user can not bid below reserve price (min bid)", async function() {
        const { auction, addr1 } = await loadFixture(deployTokenFixture);
        
        const randomValue = (Math.random() * (0.4 - 0) + 0).toString();
        await expect(auction.connect(addr1).bid({value: ethers.parseEther(randomValue)})).to.be.reverted;
        await expect(auction.connect(addr1).bid({value: ethers.parseEther("0")})).to.be.reverted;
    });
    it("user can not bid above highest bid price (max bid)", async function() {
        const { auction, addr1 } = await loadFixture(deployTokenFixture);
        
        const randomValue = (Math.random() * (1000 - 0.8) + 0.8).toString();
        await expect(auction.connect(addr1).bid({value: ethers.parseEther(randomValue)})).to.be.reverted;
    });
    it("user can bid expected price", async function() {
        const { auction, addr1 } = await loadFixture(deployTokenFixture);
        
        const randomValue = (Math.random() * (0.8 - 0.4) + 0.4).toString();
        await expect(auction.connect(addr1).bid({value: ethers.parseEther(randomValue)})).to.not.be.reverted;
    });
    it("user can not increase bid totaling to be above highest bid price (max bid)", async function() {
        const { auction, addr1, highestBidPrice } = await loadFixture(deployTokenFixture);
        
        await expect(auction.connect(addr1).bid({value: ethers.parseEther("0.7")})).to.not.be.reverted;
        await expect(auction.connect(addr1).increaseBid({value: ethers.parseEther("0.10000000000001")})).to.be.reverted;
        expect(await auction.connect(addr1).getBidAmtByBuyerId(addr1.address)).to.be.lte(highestBidPrice);
    });
    it("user can increase bid totaling into expected amount", async function() {
        const { auction, addr1, highestBidPrice } = await loadFixture(deployTokenFixture);
        
        await expect(auction.connect(addr1).bid({value: ethers.parseEther("0.7")})).to.not.be.reverted;
        await expect(auction.connect(addr1).increaseBid({value: ethers.parseEther("0.05000000000001")})).to.not.be.reverted;
        expect(await auction.connect(addr1).getBidAmtByBuyerId(addr1.address)).to.be.lte(highestBidPrice);
    });
    it("user can not increase bid below min bid increment", async function() {
        const { auction, addr1, highestBidPrice } = await loadFixture(deployTokenFixture);
        
        const lowerThanMinBid = ethers.parseEther("0.002")
        await expect(auction.connect(addr1).bid({value: ethers.parseEther("0.7")})).to.not.be.reverted;
        await expect(auction.connect(addr1).increaseBid({value: lowerThanMinBid})).to.be.reverted;
        await expect(auction.connect(addr1).increaseBid({value: ethers.parseEther("0")})).to.be.reverted;
    });
    it("user can not increase bid before placing any bid", async function() {
        const { auction, addr1, highestBidPrice } = await loadFixture(deployTokenFixture);

        await expect(auction.connect(addr1).increaseBid({value: ethers.parseEther("0.25")})).to.be.reverted;
    });
});

describe ("When heap is full", function() {
    async function deployTokenFixture() {
        const Mystery = await ethers.getContractFactory("ERC721LazyMintWith712SignatureChecker");
        const Auction = await ethers.getContractFactory("RaffleAuctionMinter");
        const [owner, recipient, admin1, admin2, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();
        
        const mystery = await Mystery.deploy('MysteryName', 'MYST', recipient.address, "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu");
        await mystery.waitForDeployment();

        const auctionEndTime = Math.round(new Date().getTime() / 1000) + 5000000;
        const mysteryContractAddress = await mystery.getAddress();
        const reservePrice = ethers.parseEther("0.4");
        const highestBidPrice = ethers.parseEther("0.8");
        const minBidIncrement = ethers.parseEther("0.01");

        const auction = await Auction.deploy(
            mysteryContractAddress,
            recipient.address,
            100,
            reservePrice,
            highestBidPrice,
            minBidIncrement,
            auctionEndTime
        );
        await auction.waitForDeployment();

        let bidders = [];

        for (let i=0;i<200;i++) {
            const randomValue = (Math.random() * (0.8 - 0.4) + 0.4).toString();
            const randomAddress = ethers.Wallet.createRandom();
            const connectedWallet = randomAddress.connect(ethers.provider);
            
            const transaction = await owner.sendTransaction({
                to: connectedWallet.address,
                value: ethers.parseEther("2.0"),
            });
            
            await auction.connect(connectedWallet).bid({value: ethers.parseEther(randomValue)});

            bidders.push(
                {
                    'address': connectedWallet,
                    'bid': randomValue
                }
            )
        }

        return {auction, owner, recipient, addr1 ,addr2, addr3, bidders, highestBidPrice};
    }
    it("user can not bid below reserve price (min bid)", async function() {
        const { auction, addr1 } = await loadFixture(deployTokenFixture);
        
        const randomValue = (Math.random() * (0.4 - 0) + 0).toString();
        await expect(auction.connect(addr1).bid({value: ethers.parseEther(randomValue)})).to.be.reverted;
        await expect(auction.connect(addr1).bid({value: ethers.parseEther("0")})).to.be.reverted;
    });
    it("user can not bid above highest bid price (max bid)", async function() {
        const { auction, addr1 } = await loadFixture(deployTokenFixture);
        
        const randomValue = (Math.random() * (1000 - 0.8) + 0.8).toString();
        await expect(auction.connect(addr1).bid({value: ethers.parseEther(randomValue)})).to.be.reverted;
    });
    it("user can bid expected price", async function() {
        const { auction, addr1 } = await loadFixture(deployTokenFixture);
        
        const randomValue = (Math.random() * (0.8 - 0.4) + 0.4).toString();
        await expect(auction.connect(addr1).bid({value: ethers.parseEther(randomValue)})).to.not.be.reverted;
    });
    // it("user cannot bid below heap floor price", async function() {
    //     const { auction, addr1 } = await loadFixture(deployTokenFixture);
        
    //     let heapFloor = await auction.floorBid();
    //     await expect(auction.connect(addr1).bid({value: heapFloor.price - BigInt(10)})).to.not.be.reverted;
        
    //     const bids = await auction.getUserBids([addr1.address]);
    //     expect(bids[0].inHeap).to.be.false;
    // });
    it("user can bid above heap floor price", async function() {
        const { auction, addr1 } = await loadFixture(deployTokenFixture);
        
        let heapFloor = await auction.floorBid();
        await expect(auction.connect(addr1).bid({value: heapFloor.price + BigInt(10)})).to.not.be.reverted;
        
        const bids = await auction.getUserBids([addr1.address]);
        expect(bids[0].inHeap).to.be.true;
    });
    it("user can bid equal to heap floor price", async function() {
        const { auction, addr1 } = await loadFixture(deployTokenFixture);
        
        let heapFloor = await auction.floorBid();
        await expect(auction.connect(addr1).bid({value: heapFloor.price})).to.not.be.reverted;
        
        const bids = await auction.getUserBids([addr1.address]);
    });
    it("user can not increase bid totaling above highest bid price (max bid)", async function() {
        const { auction, addr1, highestBidPrice } = await loadFixture(deployTokenFixture);
        
        await expect(auction.connect(addr1).bid({value: ethers.parseEther("0.7")})).to.not.be.reverted;
        await expect(auction.connect(addr1).increaseBid({value: ethers.parseEther("0.101")})).to.be.reverted;
        expect(await auction.connect(addr1).getBidAmtByBuyerId(addr1.address)).to.be.lte(highestBidPrice);
    });
    it("user can increase bid totaling into expected amount", async function() {
        const { auction, addr1, highestBidPrice } = await loadFixture(deployTokenFixture);
        
        await expect(auction.connect(addr1).bid({value: ethers.parseEther("0.7")})).to.not.be.reverted;
        await expect(auction.connect(addr1).increaseBid({value: ethers.parseEther("0.05000000000001")})).to.not.be.reverted;
        expect(await auction.connect(addr1).getBidAmtByBuyerId(addr1.address)).to.be.lte(highestBidPrice);
    });
    // it("user cannot increase bid outside heap totaling below heap floor price", async function() {
    //     const { auction, addr1 } = await loadFixture(deployTokenFixture);
        
    //     let heapFloor = await auction.floorBid();
    //     await expect(auction.connect(addr1).bid({value: ethers.parseEther("0.4")})).to.not.be.reverted;
        
    //     const incrementToBeBelowFloorPrice = heapFloor.price - ethers.parseEther("0.4") - BigInt(10);
        
    //     await expect(auction.connect(addr1).increaseBid({value: incrementToBeBelowFloorPrice})).to.not.be.reverted;

    //     const bids = await auction.getUserBids([addr1.address]);
    //     expect(bids[0].inHeap).to.be.false;
    // });
    it("user can increase bid outside heap totaling above or equal heap floor price", async function() {
        const { auction, addr1 } = await loadFixture(deployTokenFixture);
        
        let heapFloor = await auction.floorBid();
        await expect(auction.connect(addr1).bid({value: ethers.parseEther("0.4")})).to.not.be.reverted;
        
        const incrementToBeBelowFloorPrice = heapFloor.price - ethers.parseEther("0.4");
        
        await expect(auction.connect(addr1).increaseBid({value: incrementToBeBelowFloorPrice})).to.not.be.reverted;
        await expect(auction.connect(addr1).increaseBid({value: ethers.parseEther("0.01")})).to.not.be.reverted;

        const bids = await auction.getUserBids([addr1.address]);
        expect(bids[0].inHeap).to.be.true;
    });
    it("user can increase bid inside heap", async function() {
        const { auction, addr1 } = await loadFixture(deployTokenFixture);
        
        let heapFloor = await auction.floorBid();
        await expect(auction.connect(addr1).bid({value: heapFloor.price + BigInt(10)})).to.not.be.reverted;
    
        await expect(auction.connect(addr1).increaseBid({value: ethers.parseEther("0.01")})).to.not.be.reverted;

        const bids = await auction.getUserBids([addr1.address]);
        expect(bids[0].inHeap).to.be.true;
    });
    it("user can not increase bid below min bid increment", async function() {
        const { auction, addr1 } = await loadFixture(deployTokenFixture);
        
        const lowerThanMinBid = ethers.parseEther("0.002")
        await expect(auction.connect(addr1).bid({value: ethers.parseEther("0.7")})).to.not.be.reverted;
        await expect(auction.connect(addr1).increaseBid({value: lowerThanMinBid})).to.be.reverted;
        await expect(auction.connect(addr1).increaseBid({value: ethers.parseEther("0")})).to.be.reverted;
    });
    it("user can not increase bid before placing any bid", async function() {
        const { auction, addr1 } = await loadFixture(deployTokenFixture);
        
        await expect(auction.connect(addr1).increaseBid({value: ethers.parseEther("0.25")})).to.be.reverted;
    });
});