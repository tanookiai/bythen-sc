const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
import { ethers } from "hardhat";


describe ("mystery contract allowListOrBurn Tests", function() {
    async function deployTokenFixture() {
        const Mystery = await ethers.getContractFactory("ERC721LazyMintWith712SignatureChecker");
        const [owner, recipient, addr1, addr2, addr3] = await ethers.getSigners();
        const collectionURI = "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu";
        const mystery = await Mystery.deploy('Mystery', 'MYST', recipient.address, collectionURI);
        await mystery.waitForDeployment();
        return {mystery, owner, addr1, addr2, addr3};
    }
    
    it("should prevent approve if not isAllowedToListorBurn", async function() {
        const { mystery, owner, addr1, addr2} = await loadFixture(deployTokenFixture);
        const mintTx = await mystery.mint(addr1.address);
        await mintTx.wait();
        const toggleListFlagTx = await mystery.setAllowedToListorBurn(false);
        await toggleListFlagTx.wait();
        await expect(mystery.connect(addr1).approve(addr2.address, 0)).to.be.revertedWithCustomError(mystery, "NotAllowedToListBurn");//check for specific error
    });
    
    it("should prevent setApprovalForAll if not isAllowedToListorBurn", async function() {
        const { mystery, owner, addr1, addr2} = await loadFixture(deployTokenFixture);
        const mintTx = await mystery.mint(addr1.address);
        await mintTx.wait();
        const toggleListFlagTx = await mystery.setAllowedToListorBurn(false);
        await toggleListFlagTx.wait();
        await expect(mystery.connect(addr1).setApprovalForAll(addr2.address, true)).to.be.revertedWithCustomError(mystery, "NotAllowedToListBurn");
    });

    it("should prevent transferFrom if not isAllowedToListorBurn", async function() {
        const { mystery, owner, addr1, addr2} = await loadFixture(deployTokenFixture);
        const mintTx = await mystery.mint(addr1.address);
        await mintTx.wait();
        const toggleListFlagTx = await mystery.setAllowedToListorBurn(false);
        await toggleListFlagTx.wait();
        await expect(mystery.connect(addr1).transferFrom(addr1.address, addr2.address, 0)).to.be.revertedWithCustomError(mystery, "NotAllowedToListBurn");
    });

    it("should prevent safeTransferFrom if not isAllowedToListorBurn", async function() {
        const { mystery, owner, addr1, addr2} = await loadFixture(deployTokenFixture);
        const mintTx = await mystery.mint(addr1.address);
        await mintTx.wait();
        const toggleListFlagTx = await mystery.setAllowedToListorBurn(false);
        await toggleListFlagTx.wait();
        
        await expect(mystery.connect(addr1).safeTransferFrom(addr1.address, addr2.address, 0)).to.be.reverted;
        
        const dummyData = ethers.toUtf8Bytes("Hello, world!");
        await expect(mystery.connect(addr1)["safeTransferFrom(address,address,uint256,bytes)"](addr1.address, addr2.address, 0, dummyData)).to.be.reverted;
    });

    it("should allow approve if isAllowedToListorBurn", async function() {
        const { mystery, owner, addr1, addr2, addr3} = await loadFixture(deployTokenFixture);
        const mintTx = await mystery.mint(addr1.address);
        await mintTx.wait();
        const toggleListFlagTx = await mystery.setAllowedToListorBurn(true);
        await toggleListFlagTx.wait();
        await expect(mystery.connect(addr1).approve(addr2.address, 0)).to.not.be.revertedWith('Not allowed to list or burn');
        expect(await mystery.getApproved(0)).to.equal(addr2.address);
        expect(await mystery.ownerOf(0)).to.equal(addr1.address);

        const transferTx = await mystery.connect(addr2).transferFrom(addr1.address, addr3.address, 0);
        await transferTx.wait();

        expect(await mystery.ownerOf(0)).to.equal(addr3.address);
    });

    it("should allow setApprovalForAll if isAllowedToListorBurn", async function() {
        const { mystery, owner, addr1, addr2, addr3} = await loadFixture(deployTokenFixture);

        const mintTx = await mystery.mint(addr1.address);
        await mintTx.wait();
        const mintTx2 = await mystery.mint(addr1.address);
        await mintTx2.wait();
        const mintTx3 = await mystery.mint(addr1.address);
        await mintTx3.wait();

        const toggleListFlagTx = await mystery.setAllowedToListorBurn(true);
        await toggleListFlagTx.wait();
        
        await expect(mystery.connect(addr1).setApprovalForAll(addr2.address, true)).to.not.be.revertedWith('Not allowed to list or burn');
        
        expect(await mystery.isApprovedForAll(addr1, addr2)).to.equal(true);
        expect(await mystery.ownerOf(0)).to.equal(addr1.address);
        expect(await mystery.ownerOf(1)).to.equal(addr1.address);

        const transferTx = await mystery.connect(addr2).transferFrom(addr1.address, addr3.address, 0);
        await transferTx.wait();

        const transferTx2 = await mystery.connect(addr2).transferFrom(addr1.address, addr3.address, 1);
        await transferTx2.wait();

        expect(await mystery.ownerOf(0)).to.equal(addr3.address);
        expect(await mystery.ownerOf(1)).to.equal(addr3.address);
        
        await expect(mystery.connect(addr1).setApprovalForAll(addr2.address, false)).to.not.be.revertedWith('Not allowed to list or burn');
        expect(await mystery.isApprovedForAll(addr1, addr2)).to.equal(false);
    });

    it("should allow transferFrom if isAllowedToListorBurn", async function() {
        const { mystery, owner, addr1, addr2} = await loadFixture(deployTokenFixture);
        const mintTx = await mystery.mint(addr1.address);
        await mintTx.wait();
        const toggleListFlagTx = await mystery.setAllowedToListorBurn(true);
        await toggleListFlagTx.wait();
        await expect(mystery.connect(addr1).transferFrom(addr1.address, addr2.address, 0)).to.not.be.revertedWith('Not allowed to list or burn');
        expect(await mystery.ownerOf(0)).to.equal(addr2.address);
    });

    it("should allow safeTransferFrom if isAllowedToListorBurn", async function() {
        const { mystery, owner, addr1, addr2} = await loadFixture(deployTokenFixture);
        const mintTx = await mystery.mint(addr1.address);
        await mintTx.wait();
        const mintTx2 = await mystery.mint(addr1.address);
        await mintTx2.wait();
        const toggleListFlagTx = await mystery.setAllowedToListorBurn(true);
        await toggleListFlagTx.wait();
        await expect(mystery.connect(addr1).safeTransferFrom(addr1.address, addr2.address, 0)).to.not.be.reverted;
        expect(await mystery.ownerOf(0)).to.equal(addr2.address);
        
        const dummyData = ethers.toUtf8Bytes("Hello, world!");
        await expect(mystery.connect(addr1)["safeTransferFrom(address,address,uint256,bytes)"](addr1.address, addr2.address, 1, dummyData)).to.not.be.reverted;
        expect(await mystery.ownerOf(0)).to.equal(addr2.address);
        expect(await mystery.ownerOf(1)).to.equal(addr2.address);
    });
})
