const { ethers } = require('hardhat');
const { expect } = require("chai");


function getMethods(obj) {
    var result = [];
    for (var id in obj) {
      try {
          result.push(id);
      } catch (err) {
        result.push(id + ": inaccessible");
      }
    }
    return result;
  }

describe("Test Miniting and Burn", function () {
    before(async function () {
        this.accounts = await ethers.getSigners();
        ({ chainId: this.chainId } = await ethers.provider.getNetwork());
        const GenesisERC21Instance = await ethers.getContractFactory("ERC721LazyMintWith712SignatureChecker");
        const collectionURI = "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu";
        this.genesisERC21Instance = await GenesisERC21Instance.connect(this.accounts[0]).deploy('Name', 'Symbol', this.accounts[4], collectionURI);
    });

    it("Test No supply initially", async function () {
        const totalSupply = await this.genesisERC21Instance.totalSupply();
        expect(Number(totalSupply)).to.equal(0);
    });
    it("mint nft to the first account", async function () {
        await this.genesisERC21Instance.mint(this.accounts[1]);
        const totalSupply = await this.genesisERC21Instance.totalSupply();
        expect(Number(totalSupply)).to.equal(1);
    });
    it("burn nft of the first account", async function () {
        await this.genesisERC21Instance.setAllowedToListorBurn(true);
        await this.genesisERC21Instance.burn(0);
        const totalSupply = await this.genesisERC21Instance.totalSupply();
        expect(Number(totalSupply)).to.equal(0);
    });
    it("mint nft with signature", async function () {

        const domain = {
            name: 'Name',
            version: '1.0.0',
            chainId: Number(this.chainId),
            verifyingContract: await this.genesisERC21Instance.getAddress()
        }
    
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
    
        const value = {
            to: await this.accounts[1].getAddress(),
            quantity: 1,
            pricePerToken: 1,
            validityStartTimestamp: Math.round(new Date().getTime() / 1000)-50000,
            validityEndTimestamp: Math.round(new Date().getTime() / 1000)+50000,
            uid: await this.genesisERC21Instance.MINTER_ROLE() //using some uid for now. Generate some other random UID instead,
        }     

        console.log(typeof await this.genesisERC21Instance.MINTER_ROLE());
        const signature = await this.accounts[0].signTypedData(domain, types, value)
        console.log('signature:', signature);
        await this.genesisERC21Instance.mintWithSignature(value, signature, {value: 1});
        const totalSupply = await this.genesisERC21Instance.totalSupply();
        expect(Number(totalSupply)).to.equal(1);
    });
});
