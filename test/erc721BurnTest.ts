const { expect } = require("chai");
import { ethers } from "hardhat";
import { Signer, TypedDataDomain, TypedDataField } from 'ethers';
import { ERC721LazyMintWith712SignatureChecker } from '../typechain-types'


describe("Test Mystery contract burn", () => {
    let mystery: ERC721LazyMintWith712SignatureChecker;
    let owner: Signer;
    let minter: Signer;
    let recipient: Signer;
    let addr1: Signer;
    let addr2: Signer;

    beforeEach(async () => {
        [owner, minter, recipient, addr1, addr2] = await ethers.getSigners();
        const Mystery = await ethers.getContractFactory("ERC721LazyMintWith712SignatureChecker");
        const collectionURI = "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu";
        mystery = await Mystery.deploy('MysteryNFT', 'MYST', recipient.address, collectionURI);
        await mystery.waitForDeployment();
        mystery.setAllowedToListorBurn(true)
    });


    it("it should let minter role to burn", async () => {
        await mystery.grantRole(await mystery.MINTER_ROLE(), await minter.getAddress())
        const connContract = mystery.connect(minter) 
        await connContract.mint(addr1)
        await connContract.burn(Number(0))
        const totalSupply = await connContract.totalSupply();
        expect(Number(totalSupply)).to.equal(0)
        const totalMint = await connContract.balanceOf(addr1)
        expect(Number(totalMint)).to.equal(0)
    })

    it("it should let minter role to burn correct token", async () => {
        await mystery.grantRole(await mystery.MINTER_ROLE(), await minter.getAddress())
        const connContract = mystery.connect(minter) 
        await connContract.mint(addr1)
        await connContract.mint(addr2)
        await connContract.burn(Number(1))
        const totalSupply = await connContract.totalSupply();
        expect(Number(totalSupply)).to.equal(1)
        const totalMint = await connContract.balanceOf(addr2)
        expect(Number(totalMint)).to.equal(0)
    })

    it("it should not let non-minter role to burn", async () => {
        await mystery.grantRole(await mystery.MINTER_ROLE(), await minter.getAddress())
        const minterConnContract = mystery.connect(minter) 
        await minterConnContract.mint(addr1)

        const connContract = mystery.connect(addr1) 
        try {
            await connContract.burn(0)
            expect.fail('Expected function to revert');
        } catch (error: any) {
            // Assert that the error message contains the expected revert reason
            expect(error.message).to.contain('missing role');
        }
        const totalSupply = await connContract.totalSupply();
        expect(Number(totalSupply)).to.equal(1)
        const totalMint = await connContract.balanceOf(addr1)
        expect(Number(totalMint)).to.equal(1)
    })
})