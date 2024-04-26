const { expect } = require("chai");
import { ethers } from "hardhat";
import { Signer, TypedDataDomain } from 'ethers';
import { ERC721LazyMintWith712SignatureChecker } from '../typechain-types'

describe ("Test Mystery contract mintWithSignature", () => {
    let mystery: ERC721LazyMintWith712SignatureChecker;
    let owner: Signer;
    let recipient: Signer;
    let addr1: Signer;
    let domain: TypedDataDomain;

    async function signMintRequest(value: any): Promise<string> {
        const types = {
            MintRequest: [
                {name: "to", type: "address"},
                {name: "quantity", type: "uint256"},
                {name: "pricePerToken", type: "uint256"},
                {name: "validityStartTimestamp", type: "uint256"},
                {name: "validityEndTimestamp", type: "uint256"},
                {name: "uid", type: "bytes32"},
            ]
        }

        return owner.signTypedData(domain, types, value)
    }

    beforeEach(async () => {
        [owner, recipient, addr1] = await ethers.getSigners();
        const Mystery = await ethers.getContractFactory("ERC721LazyMintWith712SignatureChecker");
        const collectionURI = "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu";
        mystery = await Mystery.deploy('MysteryNFT', 'MYST', recipient.address, collectionURI);
        await mystery.waitForDeployment();

        const chainId = await ethers.provider.getNetwork().then(network => network.chainId);
        domain = {
            name: 'MysteryNFT',
            version: '1.0.0',
            chainId: Number(chainId),
            verifyingContract: await mystery.getAddress()
        }
        
    });

    it("it should not be able to be mintWithSignature with 0 ETH cost", async () => {
        const value = {
            to: await addr1.getAddress(),
            quantity: 1,
            pricePerToken: 0,
            validityStartTimestamp: Math.round(new Date().getTime() / 1000)-500000,
            validityEndTimestamp: Math.round(new Date().getTime() / 1000)+500000,
            uid: await mystery.MINTER_ROLE() //using some uid for now. Generate some other random UID instead,
        }     
        
        const signature = await signMintRequest(value)
        const userConnContract = mystery.connect(addr1)
        await expect(userConnContract.mintWithSignature(value, signature, {value: 1})).to.be.revertedWithCustomError(mystery, "InvalidRequest");
        const totalSupply = await mystery.totalSupply();
        expect(Number(totalSupply)).to.equal(0);
    })
   
    it("it should not be able to mintWithSignature past max supply", async () => {
        const value = {
            to: await addr1.getAddress(),
            quantity: 1,
            pricePerToken: 1,
            validityStartTimestamp: Math.round(new Date().getTime() / 1000)-500000,
            validityEndTimestamp: Math.round(new Date().getTime() / 1000)+500000,
            uid: await mystery.MINTER_ROLE() //using some uid for now. Generate some other random UID instead,
        }     

        mystery.setMaxTotalSupply(0)
        const signature = await signMintRequest(value)
        await expect(mystery.mintWithSignature(value, signature, {value: 1})).to.be.revertedWithCustomError(mystery, "ExceededMaxSupply");
        const totalSupply = await mystery.totalSupply();
        expect(Number(totalSupply)).to.equal(0)
    })

    it("it should transfer to recipient wallet on mint", async () => {
        const value = {
            to: await addr1.getAddress(),
            quantity: 1,
            pricePerToken: ethers.parseEther("1.0"),
            validityStartTimestamp: Math.round(new Date().getTime() / 1000)-500000,
            validityEndTimestamp: Math.round(new Date().getTime() / 1000)+500000,
            uid: await mystery.MINTER_ROLE() //using some uid for now. Generate some other random UID instead,
        }     
        
        const signature = await signMintRequest(value)
        const userConnContract = mystery.connect(addr1)
        const balanceBefore = await ethers.provider.getBalance(recipient)
        await userConnContract.mintWithSignature(value, signature, {value: ethers.parseEther("1.0")});
        const totalSupply = await mystery.totalSupply();
        const balanceAfter = await ethers.provider.getBalance(recipient)
        await expect(Number(balanceAfter)).to.be.gt(Number(balanceBefore))
    })

    it("it should be able to mint with more than 1 quantity", async () => {
        const value = {
            to: await addr1.getAddress(),
            quantity: 2,
            pricePerToken: ethers.parseEther("1.0"),
            validityStartTimestamp: Math.round(new Date().getTime() / 1000)-500000,
            validityEndTimestamp: Math.round(new Date().getTime() / 1000)+500000,
            uid: await mystery.MINTER_ROLE() //using some uid for now. Generate some other random UID instead,
        }     
        
        const signature = await signMintRequest(value)
        const userConnContract = mystery.connect(addr1)
        const balanceBefore = await ethers.provider.getBalance(recipient)
        await userConnContract.mintWithSignature(value, signature, {value: ethers.parseEther("2.0")});
        const totalSupply = await mystery.totalSupply();
        const balanceAfter = await ethers.provider.getBalance(recipient)
        await expect(Number(balanceAfter)).to.be.gt(Number(balanceBefore))
    })
    
});