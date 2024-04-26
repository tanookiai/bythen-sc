const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
import { ethers, network } from "hardhat";


describe ("when auction is running, generally", function() {
    async function deployTokenFixture() {
        const Mystery = await ethers.getContractFactory("ERC721LazyMintWith712SignatureChecker");
        const Auction = await ethers.getContractFactory("RaffleAuctionMinter");
        const [owner, recipient, admin, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8] = await ethers.getSigners();
        const mystery = await Mystery.deploy('MysteryName', 'MYST', recipient.address, "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu");
        await mystery.waitForDeployment();

        const auctionEnd = Math.round(new Date().getTime() / 1000) + 55555;

        const auction = await Auction.deploy(
            await mystery.getAddress(),
            recipient.address,
            100,
            ethers.parseEther("0.2"),
            ethers.parseEther("0.8"),
            ethers.parseEther("0.01"),
            auctionEnd
        );
        await auction.waitForDeployment();

        await mystery.grantRole(mystery.MINTER_ROLE(), auction.getAddress());
        await auction.grantRole(auction.DEFAULT_ADMIN_ROLE(), admin.address);

        return {mystery, auction, owner, admin, recipient, addr1, addr2, addr3, addr4, addr5,addr6, addr7, addr8};
    }
    it("user can bid", async function() {
        const { mystery, auction, addr1, addr2, addr3 } = await loadFixture(deployTokenFixture);

        await expect(auction.connect(addr1).bid({value: ethers.parseEther("0.3")})).to.not.be.reverted;
        await expect(auction.connect(addr2).bid({value: ethers.parseEther("0.255")})).to.not.be.reverted;
        await expect(auction.connect(addr3).bid({value: ethers.parseEther("0.5")})).to.not.be.reverted;
    });
    it("user can not bid more than once", async function() {
        const { mystery, auction, addr1, addr2, addr3 } = await loadFixture(deployTokenFixture);

        await expect(auction.connect(addr1).bid({value: ethers.parseEther("0.3")})).to.not.be.reverted;
        await expect(auction.connect(addr2).bid({value: ethers.parseEther("0.255")})).to.not.be.reverted;
        await expect(auction.connect(addr3).bid({value: ethers.parseEther("0.5")})).to.not.be.reverted;

        await expect(auction.connect(addr1).bid({value: ethers.parseEther("0.3")})).to.be.reverted;
        await expect(auction.connect(addr2).bid({value: ethers.parseEther("0.255")})).to.be.reverted;
        await expect(auction.connect(addr3).bid({value: ethers.parseEther("0.5")})).to.be.reverted;
    });
    it("user can not bid below reserve price (min bid)", async function() {
        const { mystery, auction, addr1, addr2 } = await loadFixture(deployTokenFixture);

        await expect(auction.connect(addr1).bid({value: ethers.parseEther("0.1")})).to.be.reverted;
        await expect(auction.connect(addr2).bid({value: ethers.parseEther("0.01")})).to.be.reverted;
    });
    it("user can not bid above highist bid price (max bid)", async function() {
        const { mystery, auction, addr1, addr2 } = await loadFixture(deployTokenFixture);

        await expect(auction.connect(addr1).bid({value: ethers.parseEther("5")})).to.be.reverted;
        await expect(auction.connect(addr2).bid({value: ethers.parseEther("0.80001")})).to.be.reverted;
    });
    it("user can increase bid", async function() {
        const { mystery, auction, addr1 } = await loadFixture(deployTokenFixture);

        await expect(auction.connect(addr1).bid({value: ethers.parseEther("0.3")})).to.not.be.reverted;
        await expect(auction.connect(addr1).increaseBid({value: ethers.parseEther("0.0201")})).to.not.be.reverted;
    });
    it("user can not increase bid without previously placing a bid", async function() {
        const { mystery, auction, addr1 } = await loadFixture(deployTokenFixture);

        await expect(auction.connect(addr1).increaseBid({value: ethers.parseEther("0.0201")})).to.be.reverted;    
    });
    it("user can not increase bid below minimum bid increment", async function() {
        const { mystery, auction, addr1 } = await loadFixture(deployTokenFixture);

        await expect(auction.connect(addr1).bid({value: ethers.parseEther("0.3")})).to.not.be.reverted;
        await expect(auction.connect(addr1).increaseBid({value: ethers.parseEther("0.005")})).to.be.reverted;
    });
    it("user can not increase bid resulting in total above highest bid price (max bid)", async function() {
        const { mystery, auction, addr1 } = await loadFixture(deployTokenFixture);

        await expect(auction.connect(addr1).bid({value: ethers.parseEther("0.3")})).to.not.be.reverted;
        await expect(auction.connect(addr1).increaseBid({value: ethers.parseEther("0.8")})).to.be.reverted;    
    });
    it("when a user bid, auction contract address receive right amount of fund", async function() {
        const { mystery, auction, addr1, addr2 } = await loadFixture(deployTokenFixture);

        const fundA = ethers.parseEther("0.3");
        const fundB = ethers.parseEther("0.6");
        await auction.connect(addr1).bid({value: fundA});
        await auction.connect(addr2).bid({value: fundB});

        const auctionContractAddress = await auction.getAddress();

        expect(await auction.tvl()).to.be.equal(fundA + fundB);
        expect(await ethers.provider.getBalance(auctionContractAddress)).to.be.equal(fundA + fundB);
    });
    it("when a user increase bid, auction contract address receive right amount of fund", async function() {
        const { mystery, auction, addr1, addr2 } = await loadFixture(deployTokenFixture);

        const fundA = ethers.parseEther("0.2");
        const fundB = ethers.parseEther("0.5");
        await auction.connect(addr1).bid({value: fundA});
        await auction.connect(addr1).increaseBid({value: fundB});

        const auctionContractAddress = await auction.getAddress();

        expect(await auction.tvl()).to.be.equal(fundA + fundB);
        expect(await ethers.provider.getBalance(auctionContractAddress)).to.be.equal(fundA + fundB);
    });
    it("user can not claim and refund", async function() {
        const { mystery, auction, addr1, addr2 } = await loadFixture(deployTokenFixture);

        await auction.connect(addr1).bid({value: ethers.parseEther("0.3")});
        await auction.connect(addr2).bid({value: ethers.parseEther("0.6")});

        await expect(auction.connect(addr1).claimAndRefund()).to.be.reverted;
        await expect(auction.connect(addr2).claimAndRefund()).to.be.reverted;
    });
    it("admin can change auction end time", async function() {
        const { auction, owner, admin } = await loadFixture(deployTokenFixture);

        const initialAuctionEndTime = await auction.auctionEndTime();

        const newEndTime = Math.round(new Date().getTime() / 1000) + 99999

        await expect(auction.setAuctionEndTime(newEndTime)).to.not.be.reverted;
        expect(await auction.auctionEndTime()).to.be.equal(newEndTime);

        await expect(auction.connect(admin).setAuctionEndTime(initialAuctionEndTime)).to.not.be.reverted;
        expect(await auction.auctionEndTime()).to.be.equal(initialAuctionEndTime);
    });
    it("admin can not withdraw fund to primary sale recipient", async function() {
        const { auction, owner, admin, addr1 } = await loadFixture(deployTokenFixture);

        await auction.connect(addr1).bid({value: ethers.parseEther("0.3")});
        await expect(auction.sendPayment()).to.be.reverted;
    });
    it("admin can not claim on behalf of the winners when auction still running", async function () {
        const { mystery, auction, admin, addr1, addr2, addr3 } = await loadFixture(deployTokenFixture);

        await auction.connect(addr1).bid({value: ethers.parseEther("0.3")});
        await auction.connect(addr2).bid({value: ethers.parseEther("0.255")});
        await auction.connect(addr3).bid({value: ethers.parseEther("0.5")});

        await expect(auction.connect(admin).claimWinners()).to.be.reverted;

        expect(await mystery.balanceOf(addr1)).to.be.equal(0);
        expect(await mystery.balanceOf(addr2)).to.be.equal(0);
        expect(await mystery.balanceOf(addr3)).to.be.equal(0);
    });
})