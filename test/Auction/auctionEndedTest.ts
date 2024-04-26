const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
import { ethers, network } from "hardhat";


describe ("when auction has ended, generally", function() {
    async function deployTokenFixture() {
        const Mystery = await ethers.getContractFactory("ERC721LazyMintWith712SignatureChecker");
        const Auction = await ethers.getContractFactory("RaffleAuctionMinter");
        const [owner, recipient, admin, bidder1, bidder2, bidder3, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8] = await ethers.getSigners();
        const mystery = await Mystery.deploy('MysteryName', 'MYST', recipient.address, "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu");
        await mystery.waitForDeployment();

        const auctionEnd = Math.round(new Date().getTime() / 1000) + 5555;

        const auction = await Auction.deploy(
            await mystery.getAddress(),
            recipient.address,
            2,
            ethers.parseEther("0.2"),
            ethers.parseEther("0.8"),
            ethers.parseEther("0.01"),
            auctionEnd
        );
        await auction.waitForDeployment();

        await mystery.grantRole(mystery.MINTER_ROLE(), auction.getAddress());
        await auction.grantRole(auction.DEFAULT_ADMIN_ROLE(), admin.address);

        await auction.connect(bidder1).bid({value: ethers.parseEther("0.3")})
        await auction.connect(bidder1).increaseBid({value: ethers.parseEther("0.2")})
        await auction.connect(bidder2).bid({value: ethers.parseEther("0.7")})
        await auction.connect(bidder3).bid({value: ethers.parseEther("0.8")})

        // Increase the time
        const increaseTime = 5557;
        await network.provider.send("evm_increaseTime", [increaseTime]);
        // Mine a new block for the time change to take effect
        await network.provider.send("evm_mine");

        return {mystery, auction, owner, admin, recipient, bidder1, bidder2, bidder3, addr1, addr2, addr3, addr4, addr5,addr6, addr7, addr8};
    }
    it("user can not bid", async function() {
        const { auction, addr1, addr2, addr3 } = await loadFixture(deployTokenFixture);

        await expect(auction.connect(addr1).bid({value: ethers.parseEther("0.3")})).to.be.reverted;
        await expect(auction.connect(addr2).bid({value: ethers.parseEther("0.255")})).to.be.reverted;
        await expect(auction.connect(addr3).bid({value: ethers.parseEther("0.5")})).to.be.reverted;
    });
    it("user can not increase bid", async function() {
        const { auction, bidder1, bidder2 } = await loadFixture(deployTokenFixture);

        await expect(auction.connect(bidder1).increaseBid({value: ethers.parseEther("0.2")})).to.be.reverted;
        await expect(auction.connect(bidder2).increaseBid({value: ethers.parseEther("0.155")})).to.be.reverted;
    });
    it("admin can not change auction end time", async function() {
        const { auction, owner, admin } = await loadFixture(deployTokenFixture);

        const initialAuctionEndTime = await auction.auctionEndTime();

        const newEndTime = Math.round(new Date().getTime() / 1000) + 99999

        await expect(auction.setAuctionEndTime(newEndTime)).to.be.reverted;
        await expect(auction.connect(admin).setAuctionEndTime(newEndTime)).to.be.reverted;
        
        expect(await auction.auctionEndTime()).to.be.equal(initialAuctionEndTime);
    });
    it("admin can withdraw fund to primary sale recipient", async function() {
        const { auction, recipient, admin } = await loadFixture(deployTokenFixture);

        const initialBalance =  await ethers.provider.getBalance(recipient.address);
        await expect(auction.connect(admin).sendPayment()).to.not.be.reverted;
        const afterWithdrawBalance = await ethers.provider.getBalance(recipient.address);

        expect(afterWithdrawBalance - initialBalance).to.be.gt(0);
    });
    it("admin can not withdraw fund more than once", async function() {
        const { auction, recipient, admin } = await loadFixture(deployTokenFixture);

        await expect(auction.connect(admin).sendPayment()).to.not.be.reverted;
        await expect(auction.connect(admin).sendPayment()).to.be.reverted;
    });
    it("admin can claim on behalf of the winners", async function () {
        const { mystery, auction, bidder1, bidder2, bidder3, admin } = await loadFixture(deployTokenFixture);

        await expect(auction.connect(admin).claimWinners()).to.not.be.reverted;
        expect(await mystery.balanceOf(bidder2)).to.be.equal(1);
        expect(await mystery.balanceOf(bidder3)).to.be.equal(1);
    });
})