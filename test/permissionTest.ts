const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
import { ethers } from "hardhat";


describe ("Mystery contract Permission Tests", function() {
    async function deployTokenFixture() {
        const Mystery = await ethers.getContractFactory("ERC721LazyMintWith712SignatureChecker");
        const [owner, recipient, addr1, addr2, addr3] = await ethers.getSigners();
        const collectionURI = "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu";
        const mystery = await Mystery.deploy('Mystery', 'MYST', recipient.address, collectionURI);
        await mystery.waitForDeployment();
        return {mystery, owner, addr1, addr2, addr3};
    }
    it("admin can grant new admin", async function() {
        const { mystery, owner, addr1, addr2} = await loadFixture(deployTokenFixture);

        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.false;
        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr2.address)).to.be.false;
        
        await expect(mystery.connect(addr1).grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr2.address)).to.be.reverted;

        await expect(mystery.grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.not.be.reverted;
        await expect(mystery.connect(addr1).grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr2.address)).to.not.be.reverted;

        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.true;
        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr2.address)).to.be.true;
    });
    it("admin can revoke admin", async function() {
        const { mystery, owner, addr1, addr2, addr3} = await loadFixture(deployTokenFixture);

        await mystery.grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address);
        await mystery.grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr2.address);
        await mystery.grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr3.address);

        await expect(mystery.revokeRole(mystery.DEFAULT_ADMIN_ROLE(), addr3.address)).to.not.be.reverted;
        await expect(mystery.connect(addr2).revokeRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.not.be.reverted;
        await expect(mystery.connect(addr2).revokeRole(mystery.DEFAULT_ADMIN_ROLE(), owner.address)).to.not.be.reverted;

        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.false;
        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.false;
        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr2.address)).to.be.true;
        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr3.address)).to.be.false;    
    });
    it("admin can grant new minter role", async function() {
        const { mystery, owner, addr1, addr2, addr3} = await loadFixture(deployTokenFixture);

        await mystery.grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address);

        await expect(mystery.grantRole(mystery.MINTER_ROLE(), addr2.address)).to.not.be.reverted;
        await expect(mystery.connect(addr1).grantRole(mystery.MINTER_ROLE(), addr3.address)).to.not.be.reverted;

        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr2.address)).to.be.true;
        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr3.address)).to.be.true;
    });
    it("admin can revoke minter role", async function() {
        const { mystery, owner, addr1, addr2, addr3} = await loadFixture(deployTokenFixture);

        await mystery.grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address);

        await mystery.grantRole(mystery.MINTER_ROLE(), addr1.address);
        await mystery.grantRole(mystery.MINTER_ROLE(), addr2.address);
        await mystery.grantRole(mystery.MINTER_ROLE(), addr3.address);

        await expect(mystery.revokeRole(mystery.MINTER_ROLE(), addr1.address)).to.not.be.reverted;
        await expect(mystery.connect(addr1).revokeRole(mystery.MINTER_ROLE(), addr2.address)).to.not.be.reverted;
        await expect(mystery.connect(addr1).revokeRole(mystery.MINTER_ROLE(), addr3.address)).to.not.be.reverted;

        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr1.address)).to.be.false;
        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr2.address)).to.be.false;
        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr3.address)).to.be.false;
    });
    it("non-admin can not grant new admin", async function() {
        const { mystery, owner, addr1, addr2} = await loadFixture(deployTokenFixture);

        await mystery.grantRole(mystery.MINTER_ROLE(), addr1.address);

        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.false;
        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr2.address)).to.be.false;
        
        await expect(mystery.connect(addr1).grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr2.address)).to.be.reverted;
        await expect(mystery.connect(addr1).grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.reverted;
        await expect(mystery.connect(addr2).grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.reverted;
        await expect(mystery.connect(addr2).grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr2.address)).to.be.reverted;

        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.false;
        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr2.address)).to.be.false;
    });
    it("non-admin can not revoke admin", async function() {
        const { mystery, owner, addr1, addr2, addr3} = await loadFixture(deployTokenFixture);

        await mystery.grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr3.address);
        await mystery.grantRole(mystery.MINTER_ROLE(), addr1.address);

        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr3.address)).to.be.true;
        
        await expect(mystery.connect(addr1).revokeRole(mystery.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.reverted;
        await expect(mystery.connect(addr1).revokeRole(mystery.DEFAULT_ADMIN_ROLE(), addr3.address)).to.be.reverted;
        await expect(mystery.connect(addr2).revokeRole(mystery.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.reverted;
        await expect(mystery.connect(addr2).revokeRole(mystery.DEFAULT_ADMIN_ROLE(), addr3.address)).to.be.reverted;

        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr3.address)).to.be.true;
    });
    it("non-admin can not grant new minter role", async function() {
        const { mystery, owner, addr1, addr2, addr3} = await loadFixture(deployTokenFixture);

        await mystery.grantRole(mystery.MINTER_ROLE(), addr3.address);

        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr1.address)).to.be.false;
        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr2.address)).to.be.false;
        
        await expect(mystery.connect(addr1).grantRole(mystery.MINTER_ROLE(), addr2.address)).to.be.reverted;
        await expect(mystery.connect(addr1).grantRole(mystery.MINTER_ROLE(), addr1.address)).to.be.reverted;
        await expect(mystery.connect(addr2).grantRole(mystery.MINTER_ROLE(), addr1.address)).to.be.reverted;
        await expect(mystery.connect(addr2).grantRole(mystery.MINTER_ROLE(), addr2.address)).to.be.reverted;
        await expect(mystery.connect(addr3).grantRole(mystery.MINTER_ROLE(), addr1.address)).to.be.reverted;
        await expect(mystery.connect(addr3).grantRole(mystery.MINTER_ROLE(), addr2.address)).to.be.reverted;

        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr1.address)).to.be.false;
        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr2.address)).to.be.false;
    });
    it("non-admin can not revoke minter role", async function() {
        const { mystery, owner, addr1, addr2} = await loadFixture(deployTokenFixture);

        await mystery.grantRole(mystery.MINTER_ROLE(), addr1.address);

        expect(await mystery.hasRole(mystery.MINTER_ROLE(), owner.address)).to.be.true;
        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr1.address)).to.be.true;
        
        await expect(mystery.connect(addr1).revokeRole(mystery.MINTER_ROLE(), owner.address)).to.be.reverted;
        await expect(mystery.connect(addr1).revokeRole(mystery.MINTER_ROLE(), addr1.address)).to.be.reverted;
        await expect(mystery.connect(addr2).revokeRole(mystery.MINTER_ROLE(), owner.address)).to.be.reverted;
        await expect(mystery.connect(addr2).revokeRole(mystery.MINTER_ROLE(), addr1.address)).to.be.reverted;

        expect(await mystery.hasRole(mystery.MINTER_ROLE(), owner.address)).to.be.true;
        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr1.address)).to.be.true;
    });
    it("admin can renounce admin role for self", async function() {
        const { mystery, owner, addr1, addr2} = await loadFixture(deployTokenFixture);

        await mystery.grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address);

        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.true;
        await expect(mystery.connect(addr1).renounceRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.not.be.reverted;
        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.false;
    });
    it("minter role can renounce minter role for self", async function() {
        const { mystery, owner, addr1, addr2} = await loadFixture(deployTokenFixture);

        await mystery.grantRole(mystery.MINTER_ROLE(), addr1.address);

        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr1.address)).to.be.true;
        await expect(mystery.connect(addr1).renounceRole(mystery.MINTER_ROLE(), addr1.address)).to.not.be.reverted;
        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr1.address)).to.be.false;
    });
    it("admin can not renounce other admin", async function() {
        const { mystery, owner, addr1, addr2} = await loadFixture(deployTokenFixture);

        await mystery.grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address);
        await mystery.grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr2.address);

        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.true;
        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr2.address)).to.be.true;


        await expect(mystery.renounceRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.reverted;
        await expect(mystery.renounceRole(mystery.DEFAULT_ADMIN_ROLE(), addr2.address)).to.be.reverted;
        await expect(mystery.connect(addr1).renounceRole(mystery.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.reverted;
        await expect(mystery.connect(addr1).renounceRole(mystery.DEFAULT_ADMIN_ROLE(), addr2.address)).to.be.reverted;
        
        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.true;
        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr2.address)).to.be.true;
    });
    it("admin can not renounce other minter", async function() {
        const { mystery, owner, addr1, addr2, addr3} = await loadFixture(deployTokenFixture);

        await mystery.grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address);
        await mystery.grantRole(mystery.MINTER_ROLE(), addr2.address);
        await mystery.grantRole(mystery.MINTER_ROLE(), addr3.address);

        expect(await mystery.hasRole(mystery.MINTER_ROLE(), owner.address)).to.be.true;
        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr2.address)).to.be.true;
        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr3.address)).to.be.true;

        await expect(mystery.renounceRole(mystery.MINTER_ROLE(), addr2.address)).to.be.reverted;
        await expect(mystery.renounceRole(mystery.MINTER_ROLE(), addr3.address)).to.be.reverted;
        await expect(mystery.connect(addr1).renounceRole(mystery.MINTER_ROLE(), owner.address)).to.be.reverted;
        await expect(mystery.connect(addr1).renounceRole(mystery.MINTER_ROLE(), addr2.address)).to.be.reverted;
        await expect(mystery.connect(addr1).renounceRole(mystery.MINTER_ROLE(), addr3.address)).to.be.reverted;
        
        expect(await mystery.hasRole(mystery.MINTER_ROLE(), owner.address)).to.be.true;
        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr2.address)).to.be.true;
        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr3.address)).to.be.true;
    });
    it("minter can not renounce other admin", async function() {
        const { mystery, owner, addr1, addr2} = await loadFixture(deployTokenFixture);

        await mystery.grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address);
        await mystery.grantRole(mystery.MINTER_ROLE(), addr2.address);

        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.true;

        await expect(mystery.connect(addr2).renounceRole(mystery.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.reverted;
        await expect(mystery.connect(addr2).renounceRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.reverted;

        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.true;
    });
    it("minter can not renounce other minter", async function() {
        const { mystery, owner, addr1, addr2, addr3} = await loadFixture(deployTokenFixture);

        await mystery.grantRole(mystery.MINTER_ROLE(), addr1.address);
        await mystery.grantRole(mystery.MINTER_ROLE(), addr2.address);

        expect(await mystery.hasRole(mystery.MINTER_ROLE(), owner.address)).to.be.true;
        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr1.address)).to.be.true;
        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr2.address)).to.be.true;

        await expect(mystery.renounceRole(mystery.MINTER_ROLE(), addr1.address)).to.be.reverted;
        await expect(mystery.renounceRole(mystery.MINTER_ROLE(), addr2.address)).to.be.reverted;
        await expect(mystery.connect(addr1).renounceRole(mystery.MINTER_ROLE(), owner.address)).to.be.reverted;
        await expect(mystery.connect(addr1).renounceRole(mystery.MINTER_ROLE(), addr2.address)).to.be.reverted;
        await expect(mystery.connect(addr2).renounceRole(mystery.MINTER_ROLE(), owner.address)).to.be.reverted;
        await expect(mystery.connect(addr2).renounceRole(mystery.MINTER_ROLE(), addr1.address)).to.be.reverted;

        expect(await mystery.hasRole(mystery.MINTER_ROLE(), owner.address)).to.be.true;
        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr1.address)).to.be.true;
        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr2.address)).to.be.true;
    });
    it("admin can not grant role to address if address already have the role", async function() {
        const { mystery, owner, addr1, addr2} = await loadFixture(deployTokenFixture);

        await expect(mystery.grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.not.be.reverted;
        await expect(mystery.grantRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.reverted;
        expect(await mystery.hasRole(mystery.DEFAULT_ADMIN_ROLE(), addr1.address)).to.be.true;

        await expect(mystery.grantRole(mystery.MINTER_ROLE(), addr2.address)).to.not.be.reverted;
        await expect(mystery.grantRole(mystery.MINTER_ROLE(), addr2.address)).to.be.reverted;
        expect(await mystery.hasRole(mystery.MINTER_ROLE(), addr2.address)).to.be.true;
    });
})
