const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
import { ethers } from "hardhat";


describe ("Mystery collection URI Tests", function() {
    async function deployTokenFixture() {
        const Mystery = await ethers.getContractFactory("ERC721LazyMintWith712SignatureChecker");
        const [owner, recipient, admin, minter, addr1, addr2, addr3] = await ethers.getSigners();
        const collectionURI = "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu"
        const mystery = await Mystery.deploy('MysteryName', 'MYST', recipient.address, collectionURI);
        await mystery.waitForDeployment();

        const grantRoleTx = await mystery.grantRole(mystery.DEFAULT_ADMIN_ROLE(), admin.address);
        await grantRoleTx.wait();
        const grantRoleTx2 = await mystery.grantRole(mystery.MINTER_ROLE(), minter.address);
        await grantRoleTx2.wait();
        return {mystery, owner, recipient, admin, minter, addr1, addr2, addr3};
    }
    it("collection uri is expected to be the correct uri initially set in the constructor", async function() {
        const { mystery, addr3 } = await loadFixture(deployTokenFixture);
        const mintTx = await mystery.mint(addr3.address);
        await mintTx.wait();

        const collectionURI = "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu"
        expect(await mystery.tokenURI(0)).to.be.equal(collectionURI);
    });
    it("admin can change collectionURI", async function() {
        const { mystery, owner, admin, addr3 } = await loadFixture(deployTokenFixture);
        
        const mintTx = await mystery.mint(addr3.address);
        await mintTx.wait();

        const oldCollectionURI = "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu"
        const newCollectionURI = "ipfs://bafkreidm3a22abze2pssfsee3qefye6dajmn4hos247invmx47tm24yfia"

        await expect(mystery.setCollectionURI(newCollectionURI)).to.not.be.reverted;
        expect(await mystery.tokenURI(0)).to.be.equal(newCollectionURI);

        await expect(mystery.connect(admin).setCollectionURI(oldCollectionURI)).to.not.be.reverted;
        expect(await mystery.tokenURI(0)).to.be.equal(oldCollectionURI);
    });
    it("non admin can not change collectionURI", async function() {
        const { mystery, minter, recipient, addr1, addr2 } = await loadFixture(deployTokenFixture);
        
        const mintTx = await mystery.mint(addr2.address);
        await mintTx.wait();

        const previousCollectionURI = "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu"
        const newCollectionURI = "ipfs://bafkreidm3a22abze2pssfsee3qefye6dajmn4hos247invmx47tm24yfia"

        await expect(mystery.connect(minter).setCollectionURI(newCollectionURI)).to.be.reverted;
        await expect(mystery.connect(recipient).setCollectionURI(newCollectionURI)).to.be.reverted;
        await expect(mystery.connect(addr1).setCollectionURI(newCollectionURI)).to.be.reverted;
        expect(await mystery.tokenURI(0)).to.be.equal(previousCollectionURI);
    });
    it("each token's tokenURI updated for all existing tokens when collection uri updated by admin", async function() {
        const { mystery, minter, recipient, addr1, addr2 } = await loadFixture(deployTokenFixture);

        const mintTx = await mystery.mint(addr2.address);
        await mintTx.wait();
        
        const mintCount = 15;
        let promises = [];
        for (let i = 0; i < mintCount; i++) {
            const promise = mystery.mint(addr2.address);
            promises.push(promise);
        }
        await Promise.all(promises);
        
        const previousCollectionURI = "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu"
        for (let i = 0; i < mintCount; i++) {
            expect(await mystery.tokenURI(i)).to.be.equal(previousCollectionURI);
        }

        const newCollectionURI = "ipfs://bafkreidm3a22abze2pssfsee3qefye6dajmn4hos247invmx47tm24yfia";
        const changeColletionURITx = await mystery.setCollectionURI(newCollectionURI);
        await changeColletionURITx.wait();
        
        for (let i = 0; i < mintCount; i++) {
            expect(await mystery.tokenURI(i)).to.be.equal(newCollectionURI);
        }
    });

    it("each token's tokenURI updated for all upcoming new tokens when collection uri updated by admin", async function() {
        const { mystery, minter, recipient, addr1, addr2 } = await loadFixture(deployTokenFixture);
        
        const mintTx = await mystery.mint(addr2.address);
        await mintTx.wait();
        
        const previousCollectionURI = "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu";
        expect(await mystery.tokenURI(0)).to.be.equal(previousCollectionURI);

        const newCollectionURI = "ipfs://bafkreidm3a22abze2pssfsee3qefye6dajmn4hos247invmx47tm24yfia";
        const changeColletionURITx = await mystery.setCollectionURI(newCollectionURI);
        await changeColletionURITx.wait();

        const mintCount = 15;
        let promises = [];
        for (let i = 0; i < mintCount; i++) {
            const promise = mystery.mint(addr2.address);
            promises.push(promise);
        }
        await Promise.all(promises);
        
        for (let i = 0; i < mintCount+1; i++) {
            expect(await mystery.tokenURI(i)).to.be.equal(newCollectionURI);
        }
    });
})