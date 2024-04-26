const { expect } = require("chai");
import { ethers } from "hardhat";
import { Signer, TypedDataDomain, TypedDataField } from 'ethers';
import { ERC721LazyMintWith712SignatureChecker } from '../typechain-types'

describe("Test Mystery contract mint", () => {
    let mystery: ERC721LazyMintWith712SignatureChecker;
    let owner: Signer;
    let minter: Signer;
    let addr1: Signer;
    let recipient: Signer;

    beforeEach(async () => {
        [owner, minter, recipient, addr1] = await ethers.getSigners();
        const Mystery = await ethers.getContractFactory("ERC721LazyMintWith712SignatureChecker");
        const collectionURI = "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu";
        mystery = await Mystery.deploy('MysteryNFT', 'MYST', recipient.address, collectionURI);
        await mystery.waitForDeployment();
    });


    it("it should let minter role to mint without signature", async () => {
        await mystery.grantRole(await mystery.MINTER_ROLE(),await minter.getAddress())
        const minterContract = mystery.connect(minter) 
        await minterContract.mint(addr1)
        const totalSupply = await minterContract.totalSupply();
        expect(Number(totalSupply)).to.equal(1)
        const totalMint = await minterContract.balanceOf(addr1)
        expect(Number(totalMint)).to.equal(1)
    })

    it("it should not let non-minter role to mint without signature", async () => {
        const userContract = mystery.connect(addr1) 
        try {
            await userContract.mint(addr1)
            expect.fail('Expected function to revert');
        } catch (error: any) {
            // Assert that the error message contains the expected revert reason
            expect(error.message).to.contain('missing role');
        }
        const totalSupply = await userContract.totalSupply();
        expect(Number(totalSupply)).to.equal(0)
        const totalMint = await userContract.balanceOf(addr1)
        expect(Number(totalMint)).to.equal(0)
    })

    it("it should not be able to mint past max supply", async () => {
        mystery.setMaxTotalSupply(0)
        await mystery.grantRole(await mystery.MINTER_ROLE(),await minter.getAddress())
        const minterContract = mystery.connect(minter) 
        await expect(minterContract.mint(addr1)).to.be.revertedWithCustomError(mystery, "ExceededMaxSupply");
        const totalSupply = await minterContract.totalSupply();
        expect(Number(totalSupply)).to.equal(0)
    })
})