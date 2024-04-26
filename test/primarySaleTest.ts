const { expect } = require("chai");
import { ethers } from "hardhat";
import { Signer, TypedDataDomain, TypedDataField } from 'ethers';
import { ERC721LazyMintWith712SignatureChecker } from '../typechain-types'

describe("mystery NFT primarySale tests", () => {
    let mystery: ERC721LazyMintWith712SignatureChecker;
    let owner: Signer;
    let admin: Signer;
    let minter: Signer;
    let recipient: Signer;
    let addr1: Signer;
    let addr2: Signer;

    async function signMintRequest(value: any, _signer: Signer): Promise<string> {
        const network = await ethers.provider.getNetwork();
        const chainId = network.chainId;

        const domain: {
            name: string;
            version: string;
            chainId: number;
            verifyingContract: string;
        } = {
            name: await mystery.name(),
            version: '1.0.0',
            chainId: Number(chainId),
            verifyingContract: await mystery.getAddress()
        };

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

        return _signer.signTypedData(domain, types, value)
    }

    beforeEach(async () => {
        [owner, admin, minter, recipient, addr1, addr2] = await ethers.getSigners();
        const Mystery = await ethers.getContractFactory("ERC721LazyMintWith712SignatureChecker");
        const collectionURI = "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu";
        mystery = await Mystery.deploy('MysteryNFT', 'MYST', recipient.address, collectionURI);
        await mystery.waitForDeployment();
        await mystery.grantRole(await mystery.DEFAULT_ADMIN_ROLE(), admin.address);
        await mystery.grantRole(await mystery.MINTER_ROLE(), minter.address);
    });


    it("primary sale recipient should be the correct wallet address set in the constructor", async () => {
        expect(await mystery.primarySaleRecipient()).to.be.equal(recipient.address);
    });

    it("admin can change parimary sale recipient", async () => {
        await expect(mystery.setPrimarySaleRecipient(addr1.address)).to.not.be.reverted;
        expect(await mystery.primarySaleRecipient()).to.be.equal(addr1.address);
        await expect(mystery.connect(admin).setPrimarySaleRecipient(addr2.address)).to.not.be.reverted;
        expect(await mystery.primarySaleRecipient()).to.be.equal(addr2.address);
    });

    it("non admin can not change primary sale recipient", async () => {
        const previousRecipient = await mystery.primarySaleRecipient();
        await expect(mystery.connect(minter).setPrimarySaleRecipient(addr1.address)).to.be.reverted;
        await expect(mystery.connect(recipient).setPrimarySaleRecipient(addr1.address)).to.be.reverted;
        await expect(mystery.connect(addr1).setPrimarySaleRecipient(addr1.address)).to.be.reverted;
        expect(await mystery.primarySaleRecipient()).to.be.equal(previousRecipient);
    });

    it("admin can not change primary sale recipient to address(0)", async () => {
        const zeroAddress = "0x0000000000000000000000000000000000000000";
        const previousRecipient = await mystery.primarySaleRecipient();
        await expect(mystery.connect(admin).setPrimarySaleRecipient(zeroAddress)).to.be.reverted;
        await expect(mystery.setPrimarySaleRecipient(zeroAddress)).to.be.reverted;
        expect(await mystery.primarySaleRecipient()).to.be.equal(previousRecipient);
    });

    it("recipient receive right amount of fund everytime user mintWithSignature", async () => {
        let initialBalanceRecipient: bigint;
        let pricePerToken: bigint;
        let currentBalance: BigInt;
        let currentBalanceRecipient: bigint;
        
        initialBalanceRecipient = await ethers.provider.getBalance(recipient);        
        pricePerToken = ethers.parseEther("12.512477");
        
        let value = {
            to: await addr2.address,
            quantity: 1,
            pricePerToken: pricePerToken,
            validityStartTimestamp: Math.round(new Date().getTime() / 1000)-50000,
            validityEndTimestamp: Math.round(new Date().getTime() / 1000)+50000,
            uid: await mystery.MINTER_ROLE()
        }

        let signature = signMintRequest(value, minter);
        await expect(mystery.connect(addr2).mintWithSignature(value, signature, {value: pricePerToken})).to.not.be.reverted;

        currentBalance = await ethers.provider.getBalance(addr2);
        currentBalanceRecipient = await ethers.provider.getBalance(recipient);

        expect(await mystery.ownerOf(0)).to.equal(addr2.address);
        expect(await mystery.balanceOf(addr2.address)).to.equal(1);
        expect(await mystery.totalSupply()).to.equal(1);
        expect(currentBalanceRecipient - initialBalanceRecipient).to.be.equal(pricePerToken);

        initialBalanceRecipient = await ethers.provider.getBalance(recipient);
        pricePerToken = ethers.parseEther("3.56311");

        value = {
            to: await addr2.address,
            quantity: 1,
            pricePerToken: pricePerToken,
            validityStartTimestamp: Math.round(new Date().getTime() / 1000)-50000,
            validityEndTimestamp: Math.round(new Date().getTime() / 1000)+50000,
            uid: await mystery.DEFAULT_ADMIN_ROLE()
        }

        signature = signMintRequest(value, minter);
        await expect(mystery.connect(addr2).mintWithSignature(value, signature, {value: pricePerToken})).to.not.be.reverted;
        currentBalanceRecipient = await ethers.provider.getBalance(recipient);
        
        expect(await mystery.ownerOf(1)).to.equal(addr2.address);
        expect(await mystery.balanceOf(addr2.address)).to.equal(2);
        expect(await mystery.totalSupply()).to.equal(2);
        expect(currentBalanceRecipient - initialBalanceRecipient).to.be.equal(pricePerToken);
    });
})