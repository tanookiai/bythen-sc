const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
import { ethers, network } from "hardhat";


describe ("when executing admin only functions", function() {
    async function deployTokenFixture() {
        const Mystery = await ethers.getContractFactory("ERC721LazyMintWith712SignatureChecker");
        const Auction = await ethers.getContractFactory("RaffleAuctionMinter");
        const [owner, recipient, admin1, admin2, addr1, addr2, addr3] = await ethers.getSigners();
        
        const mystery = await Mystery.deploy('MysteryName', 'MYST', recipient.address, "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu");
        await mystery.waitForDeployment();

        const auctionEndTime = Math.round(new Date().getTime() / 1000) + 5000;
        const mysteryContractAddress = await mystery.getAddress();
        const reservePrice = ethers.parseEther("0.111");
        const highestBidPrice = ethers.parseEther("5.555");
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

        await auction.grantRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address);
        await auction.grantRole(auction.DEFAULT_ADMIN_ROLE(), admin2.address);

        return {auction, owner, recipient, admin1, admin2, addr1 ,addr2, addr3, mysteryContractAddress,auctionEndTime, reservePrice, minBidIncrement, highestBidPrice };
    }
    describe ("admin role", function() {
        it("can change primary sale recipient", async function() {
            const { auction, owner, recipient, admin1, admin2, addr1, addr2 } = await loadFixture(deployTokenFixture);
            expect(await auction.primarySaleRecipient()).to.be.equal(recipient.address);
            
            await expect(auction.setPrimarySaleRecipient(addr1.address)).to.not.be.reverted;
            expect(await auction.primarySaleRecipient()).to.be.equal(addr1.address);
            
            await expect(auction.connect(owner).setPrimarySaleRecipient(recipient.address)).to.not.be.reverted;
            expect(await auction.connect(owner).primarySaleRecipient()).to.be.equal(recipient.address);
    
            await expect(auction.connect(admin1).setPrimarySaleRecipient(addr2.address)).to.not.be.reverted;
            expect(await auction.connect(admin1).primarySaleRecipient()).to.be.equal(addr2.address);
    
            await expect(auction.connect(admin2).setPrimarySaleRecipient(recipient.address)).to.not.be.reverted;
            expect(await auction.connect(admin2).primarySaleRecipient()).to.be.equal(recipient.address);
        });
        it("can change nft address being auctioned", async function() {
            const { auction, owner, admin1, admin2, addr1, addr2, mysteryContractAddress } = await loadFixture(deployTokenFixture);
            expect(await auction.nftAddress()).to.be.equal(mysteryContractAddress);
            
            await expect(auction.setNftAddress(addr1.address)).to.not.be.reverted;
            expect(await auction.nftAddress()).to.be.equal(addr1.address);
    
            await expect(auction.connect(owner).setNftAddress(mysteryContractAddress)).to.not.be.reverted;
            expect(await auction.connect(owner).nftAddress()).to.be.equal(mysteryContractAddress);
    
            await expect(auction.connect(admin1).setNftAddress(addr1.address)).to.not.be.reverted;
            expect(await auction.connect(admin1).nftAddress()).to.be.equal(addr1.address);
    
            await expect(auction.connect(admin2).setNftAddress(mysteryContractAddress)).to.not.be.reverted;
            expect(await auction.connect(admin2).nftAddress()).to.be.equal(mysteryContractAddress);
        });
        it("can change auction end time", async function() {
            const { auction, owner, admin1, admin2 , auctionEndTime} = await loadFixture(deployTokenFixture);
            expect(await auction.auctionEndTime()).to.be.equal(auctionEndTime);
    
            const newEndTime = Math.round(new Date().getTime() / 1000) + Math.round(Math.random()*1000);
            await expect(auction.setAuctionEndTime(newEndTime)).to.not.be.reverted;
            expect(await auction.auctionEndTime()).to.be.equal(newEndTime);
    
            await expect(auction.connect(admin1).setAuctionEndTime(auctionEndTime)).to.not.be.reverted;
            expect(await auction.connect(admin1).auctionEndTime()).to.be.equal(auctionEndTime);
        });
        it("can change reserve price (min bid)", async function() {
            const { auction, owner, admin1, admin2 , reservePrice} = await loadFixture(deployTokenFixture);
            expect(await auction.reservePrice()).to.be.equal(reservePrice);
    
            const newReservePrice = ethers.parseEther("0.013");
            await expect(auction.setReservePrice(newReservePrice)).to.not.be.reverted;
            expect(await auction.reservePrice()).to.be.equal(newReservePrice);
    
            await expect(auction.connect(admin1).setReservePrice(reservePrice)).to.not.be.reverted;
            expect(await auction.connect(admin1).reservePrice()).to.be.equal(reservePrice);
        });
        it("can change highest bid price (max bid)", async function() {
            const { auction, owner, admin1, admin2 , highestBidPrice} = await loadFixture(deployTokenFixture);
            expect(await auction.highestBidPrice()).to.be.equal(highestBidPrice);
    
            const newHighestBidPrice = ethers.parseEther("5.0");
            await expect(auction.setHighestBidPrice(newHighestBidPrice)).to.not.be.reverted;
            expect(await auction.highestBidPrice()).to.be.equal(newHighestBidPrice);
    
            await expect(auction.connect(admin1).setHighestBidPrice(highestBidPrice)).to.not.be.reverted;
            expect(await auction.connect(admin1).highestBidPrice()).to.be.equal(highestBidPrice);
        });
        it("can change min bid increment", async function() {
            const { auction, owner, admin1, admin2 , minBidIncrement} = await loadFixture(deployTokenFixture);
            expect(await auction.minStackedBidIncrement()).to.be.equal(minBidIncrement);
    
            const newMinBidIncrement = ethers.parseEther("0.07123");
            await expect(auction.setMinReplacementIncrease(newMinBidIncrement)).to.not.be.reverted;
            expect(await auction.minStackedBidIncrement()).to.be.equal(newMinBidIncrement);
    
            await expect(auction.connect(admin1).setMinReplacementIncrease(minBidIncrement)).to.not.be.reverted;
            expect(await auction.connect(admin1).minStackedBidIncrement()).to.be.equal(minBidIncrement);
        });
        it("can grant new admin", async function() {
            const { auction, owner, admin1, admin2 , addr1, addr2} = await loadFixture(deployTokenFixture);
            expect(await auction.hasRole(auction.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.false;
    
            await expect(auction.grantRole(auction.DEFAULT_ADMIN_ROLE(), addr1.address)).to.not.be.reverted;
            expect(await auction.hasRole(auction.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.true;
    
            await expect(auction.connect(admin1).grantRole(auction.DEFAULT_ADMIN_ROLE(), addr2.address)).to.not.be.reverted;
            expect(await auction.hasRole(auction.DEFAULT_ADMIN_ROLE(), addr2.address)).to.be.true;
        });
        it("can revoke admin role", async function() {
            const { auction, owner, admin1, admin2 , addr1, addr2} = await loadFixture(deployTokenFixture);
            expect(await auction.hasRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address)).to.be.true;
            await auction.grantRole(auction.DEFAULT_ADMIN_ROLE(), addr1.address);
            expect(await auction.hasRole(auction.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.true;
            
            await expect(auction.revokeRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address)).to.not.be.reverted;
            expect(await auction.hasRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address)).to.be.false;
            
            await expect(auction.connect(admin2).revokeRole(auction.DEFAULT_ADMIN_ROLE(), owner.address)).to.not.be.reverted;
            expect(await auction.hasRole(auction.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.false;
            
            await expect(auction.connect(addr1).revokeRole(auction.DEFAULT_ADMIN_ROLE(), addr1.address)).to.not.be.reverted;
            expect(await auction.hasRole(auction.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.false;
        });
        it("can not grant admin role to an already admin", async function() {
            const { auction, owner, admin1, admin2 , addr1, addr2} = await loadFixture(deployTokenFixture);
            await expect(auction.grantRole(auction.DEFAULT_ADMIN_ROLE(), addr1.address)).to.not.be.reverted;
            expect(await auction.hasRole(auction.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.true;
            
            await expect(auction.grantRole(auction.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.reverted;
            await expect(auction.connect(admin1).grantRole(auction.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.reverted;
        });
        it("can renounce admin role from self", async function() {
            const { auction, owner, admin1, admin2 } = await loadFixture(deployTokenFixture);
            await expect(auction.renounceRole(auction.DEFAULT_ADMIN_ROLE(), owner.address)).to.not.be.reverted;
            await expect(auction.connect(admin1).renounceRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address)).to.not.be.reverted;
        });
        it("can not renounce admin role from other admin", async function() {
            const { auction, owner, admin1, admin2 } = await loadFixture(deployTokenFixture);
            await expect(auction.renounceRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address)).to.be.reverted;
            await expect(auction.renounceRole(auction.DEFAULT_ADMIN_ROLE(), admin2.address)).to.be.reverted;
    
            await expect(auction.connect(admin1).renounceRole(auction.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.reverted;
            await expect(auction.connect(admin1).renounceRole(auction.DEFAULT_ADMIN_ROLE(), admin2.address)).to.be.reverted;
    
            await expect(auction.connect(admin2).renounceRole(auction.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.reverted;
            await expect(auction.connect(admin2).renounceRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address)).to.be.reverted;
        });
        it("is prevented to revoke admin role from self if self is last admin", async function() {
            const { auction, owner, admin1, admin2 } = await loadFixture(deployTokenFixture);
            await expect(auction.revokeRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address)).to.not.be.reverted;
            await expect(auction.revokeRole(auction.DEFAULT_ADMIN_ROLE(), owner.address)).to.not.be.reverted;
            
            expect(await auction.getRoleMemberCount(auction.DEFAULT_ADMIN_ROLE())).to.be.equal(1);
            await expect(auction.connect(admin2).revokeRole(auction.DEFAULT_ADMIN_ROLE(), admin2.address)).to.be.reverted;
            expect(await auction.getRoleMemberCount(auction.DEFAULT_ADMIN_ROLE())).to.be.equal(1);
        });
        it("is prevented to renounce admin role from self if self is last admin", async function() {
            const { auction, owner, admin1, admin2 } = await loadFixture(deployTokenFixture);
            await expect(auction.connect(admin1).renounceRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address)).to.not.be.reverted;
            await expect(auction.connect(owner).renounceRole(auction.DEFAULT_ADMIN_ROLE(), owner.address)).to.not.be.reverted;
            
            expect(await auction.getRoleMemberCount(auction.DEFAULT_ADMIN_ROLE())).to.be.equal(1);
            await expect(auction.connect(admin2).renounceRole(auction.DEFAULT_ADMIN_ROLE(), admin2.address)).to.be.reverted;
            expect(await auction.getRoleMemberCount(auction.DEFAULT_ADMIN_ROLE())).to.be.equal(1);
        });
    });
    describe ("non-admin role", function() {
        it("can not change primary sale recipient", async function() {
            const { auction, recipient, addr1, addr2 } = await loadFixture(deployTokenFixture);
            expect(await auction.primarySaleRecipient()).to.be.equal(recipient.address);
            
            await expect(auction.connect(recipient).setPrimarySaleRecipient(addr1.address)).to.be.reverted;
            await expect(auction.connect(addr1).setPrimarySaleRecipient(addr1.address)).to.be.reverted;
            await expect(auction.connect(addr2).setPrimarySaleRecipient(addr1.address)).to.be.reverted;

            expect(await auction.primarySaleRecipient()).to.be.equal(recipient.address);
        });
        it("can not change nft address being auctioned", async function() {
            const { auction, recipient, addr1, addr2 } = await loadFixture(deployTokenFixture);
            
            await expect(auction.connect(recipient).setNftAddress(addr1.address)).to.be.reverted;
            await expect(auction.connect(addr1).setNftAddress(addr1.address)).to.be.reverted;
            await expect(auction.connect(addr2).setNftAddress(addr1.address)).to.be.reverted;
        });
        it("can not change auction end time", async function() {
            const { auction, recipient, addr1, addr2 } = await loadFixture(deployTokenFixture);

            const newEndTime = Math.round(new Date().getTime() / 1000) + Math.round(Math.random()*1000);
            await expect(auction.connect(recipient).setAuctionEndTime(newEndTime)).to.be.reverted;
            await expect(auction.connect(addr1).setAuctionEndTime(newEndTime)).to.be.reverted;
            await expect(auction.connect(addr2).setAuctionEndTime(newEndTime)).to.be.reverted;
        });
        it("can not change reserve price (min bid)", async function() {
            const { auction, recipient, addr1, addr2, reservePrice } = await loadFixture(deployTokenFixture);
            expect(await auction.reservePrice()).to.be.equal(reservePrice);
    
            const newReservePrice = ethers.parseEther("0.013");
            await expect(auction.connect(recipient).setReservePrice(newReservePrice)).to.be.reverted;
            await expect(auction.connect(addr1).setReservePrice(newReservePrice)).to.be.reverted;
            await expect(auction.connect(addr2).setReservePrice(newReservePrice)).to.be.reverted;

            expect(await auction.reservePrice()).to.be.equal(reservePrice);
        });
        it("can not change highest bid price (max bid)", async function() {
            const { auction, recipient, addr1, addr2, highestBidPrice } = await loadFixture(deployTokenFixture);
            expect(await auction.highestBidPrice()).to.be.equal(highestBidPrice);
    
            const newHighestBidPrice = ethers.parseEther("5.0");
            await expect(auction.connect(recipient).setHighestBidPrice(newHighestBidPrice)).to.be.reverted;
            await expect(auction.connect(addr1).setHighestBidPrice(newHighestBidPrice)).to.be.reverted;
            await expect(auction.connect(addr2).setHighestBidPrice(newHighestBidPrice)).to.be.reverted;

            expect(await auction.highestBidPrice()).to.be.equal(highestBidPrice);
        });
        it("can not change min bid increment", async function() {
            const { auction, recipient, addr1, addr2, minBidIncrement } = await loadFixture(deployTokenFixture);
            expect(await auction.minStackedBidIncrement()).to.be.equal(minBidIncrement);
    
            const newMinBidIncrement = ethers.parseEther("0.07123");
            await expect(auction.connect(recipient).setMinReplacementIncrease(newMinBidIncrement)).to.be.reverted;
            await expect(auction.connect(addr1).setMinReplacementIncrease(newMinBidIncrement)).to.be.reverted;
            await expect(auction.connect(addr2).setMinReplacementIncrease(newMinBidIncrement)).to.be.reverted;

            expect(await auction.minStackedBidIncrement()).to.be.equal(minBidIncrement);
        });
        it("can not grant new admin", async function() {
            const { auction, recipient, addr1, addr2 } = await loadFixture(deployTokenFixture);
            expect(await auction.hasRole(auction.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.false;

            await expect(auction.connect(recipient).grantRole(auction.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.reverted;
            await expect(auction.connect(addr1).grantRole(auction.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.reverted;
            await expect(auction.connect(addr2).grantRole(auction.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.reverted;
    
            expect(await auction.hasRole(auction.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.false;
        });
        it("can not revoke admin role", async function() {
            const { auction, recipient, addr1, addr2, admin1 } = await loadFixture(deployTokenFixture);
            expect(await auction.hasRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address)).to.be.true;

            await expect(auction.connect(recipient).revokeRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address)).to.be.reverted;
            await expect(auction.connect(addr1).revokeRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address)).to.be.reverted;
            await expect(auction.connect(addr2).revokeRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address)).to.be.reverted;

            expect(await auction.hasRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address)).to.be.true;
        });
        it("can not renounce admin role from other admin", async function() {
            const { auction, recipient, addr1, addr2, admin1 } = await loadFixture(deployTokenFixture);
            expect(await auction.hasRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address)).to.be.true;

            await expect(auction.connect(recipient).renounceRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address)).to.be.reverted;
            await expect(auction.connect(addr1).renounceRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address)).to.be.reverted;
            await expect(auction.connect(addr2).renounceRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address)).to.be.reverted;

            expect(await auction.hasRole(auction.DEFAULT_ADMIN_ROLE(), admin1.address)).to.be.true;
        });
    });
})
