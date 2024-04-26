const { ethers } = require('hardhat');
const { expect } = require("chai");
describe("Test Public Raffle Minter", function () {
    beforeEach(async function () {
        this.accounts = await ethers.getSigners();
        const recipient = this.accounts[10];
        const GenesisERC21Instance = await ethers.getContractFactory("ERC721LazyMintWith712SignatureChecker");
        const collectionURI = "ipfs://bafkreiczdmwpynyqwskj7clvcuyczdxxmp3ev77v7rxvlvqsf7fzcgnoiu";
        this.genesisERC21Instance = await GenesisERC21Instance.connect(this.accounts[0]).deploy('Name', 'Symbol', recipient, collectionURI);
        this.erc21Address = await this.genesisERC21Instance.getAddress()
        const RaffleAuctionMinter = await ethers.getContractFactory("RaffleAuctionMinter");
        this.auctionMinterInstance = await RaffleAuctionMinter.connect(this.accounts[0]).deploy(
                                            this.erc21Address, 
                                            this.accounts[1], 
                                            5, 
                                            ethers.parseUnits("1","ether"),
                                            ethers.parseUnits("10","ether"),
                                            ethers.parseUnits("0.1","ether"),
                                            Math.round(new Date().getTime() / 1000)+50000);
    });

    it("Test zero bids", async function () {
        const totalBids = await this.auctionMinterInstance.getTotalBidsCnt();
        expect(Number(totalBids)).to.equal(0);
    });
    it("Bid and test count", async function () {
        await this.auctionMinterInstance.bid({value: ethers.parseEther("1")});
        const totalBids = await this.auctionMinterInstance.getTotalBidsCnt();
        expect(Number(totalBids)).to.equal(1);
    });
    it("Bid ceiling test", async function () {
        await this.auctionMinterInstance.connect(this.accounts[0]).bid({value: ethers.parseEther("1")});
        await this.auctionMinterInstance.connect(this.accounts[1]).bid({value: ethers.parseEther("2"), from: this.accounts[1]});
        await this.auctionMinterInstance.connect(this.accounts[2]).bid({value: ethers.parseEther("3"), from: this.accounts[2]});
        await this.auctionMinterInstance.connect(this.accounts[3]).bid({value: ethers.parseEther("4"), from: this.accounts[3]});
        await this.auctionMinterInstance.connect(this.accounts[4]).bid({value: ethers.parseEther("5"), from: this.accounts[4]});
        await this.auctionMinterInstance.connect(this.accounts[5]).bid({value: ethers.parseEther("6"), from: this.accounts[5]});
        const totalBids = await this.auctionMinterInstance.getTotalBidsCnt();
        console.log('totalBids:', totalBids.toString());
        console.log('number totalBids:', Number(totalBids));
        expect(Number(totalBids)).to.equal(6);

        const minBid = await this.auctionMinterInstance.floorBid();
        console.log('min bid', minBid[1]);
        expect(minBid[1]).to.equal(ethers.parseEther("2"));

    });

    it("Bid increment test 1", async function () {
        await this.auctionMinterInstance.connect(this.accounts[0]).bid({value: ethers.parseEther("1")});
        await this.auctionMinterInstance.connect(this.accounts[1]).bid({value: ethers.parseEther("2"), from: this.accounts[1]});
        await this.auctionMinterInstance.connect(this.accounts[2]).bid({value: ethers.parseEther("3"), from: this.accounts[2]});
        await this.auctionMinterInstance.connect(this.accounts[3]).bid({value: ethers.parseEther("4"), from: this.accounts[3]});
        await this.auctionMinterInstance.connect(this.accounts[4]).bid({value: ethers.parseEther("5"), from: this.accounts[4]});
        await this.auctionMinterInstance.connect(this.accounts[5]).bid({value: ethers.parseEther("6"), from: this.accounts[5]});
        var minBid = await this.auctionMinterInstance.floorBid();
        console.log('min bid before increment', minBid[1]);

        await this.auctionMinterInstance.connect(this.accounts[0]).increaseBid({value: ethers.parseEther("3")});

        minBid = await this.auctionMinterInstance.floorBid();
        console.log('min bid after increment', minBid[1]);
        expect(minBid[1]).to.equal(ethers.parseEther("3"));

        await this.auctionMinterInstance.connect(this.accounts[1]).increaseBid({value: ethers.parseEther("0.5")});
        minBid = await this.auctionMinterInstance.floorBid();
        console.log('min bid after increment', minBid[1]);
        expect(minBid[1]).to.equal(ethers.parseEther("3"));

        await this.auctionMinterInstance.connect(this.accounts[1]).increaseBid({value: ethers.parseEther("1.5")});
        minBid = await this.auctionMinterInstance.floorBid();
        console.log('min bid after increment', minBid[1]);
        expect(minBid[1]).to.equal(ethers.parseEther("4"));
    });

    it("Bid increment test 2", async function () {
        for(i = 0; i < 10; i++) {
            await this.auctionMinterInstance.connect(this.accounts[i]).bid({value: ethers.parseEther((i+1).toString())});
        }
        var minBid = await this.auctionMinterInstance.floorBid();
        console.log('min bid after increment', minBid[1]);
        expect(minBid[1]).to.equal(ethers.parseEther("6"));

        await this.auctionMinterInstance.connect(this.accounts[1]).increaseBid({value: ethers.parseEther("6.5")});
        minBid = await this.auctionMinterInstance.floorBid();
        console.log('min bid after increment', minBid[1]);
        expect(minBid[1]).to.equal(ethers.parseEther("7"));
    });

    it("Bid increment test 3", async function () {
        for(i = 0; i < 10; i++) {
            await this.auctionMinterInstance.connect(this.accounts[i]).bid({value: ethers.parseEther((i+1).toString())});
        }
        var minBid = await this.auctionMinterInstance.floorBid();
        console.log('min bid after increment', minBid[1]);
        expect(minBid[1]).to.equal(ethers.parseEther("6"));

        await this.auctionMinterInstance.connect(this.accounts[7]).increaseBid({value: ethers.parseEther("1")});
        minBid = await this.auctionMinterInstance.floorBid();
        console.log('min bid after increment', minBid[1]);
        expect(minBid[1]).to.equal(ethers.parseEther("6"));

        var claimInfo = await this.auctionMinterInstance.getUserClaimInfos([this.accounts[0], this.accounts[5], this.accounts[6], this.accounts[7]]);
        console.log('Claim Info: ', claimInfo[0]);
        expect(claimInfo[0][0]).to.equal(false);
        expect(claimInfo[0][1]).to.equal(ethers.parseEther("1"));
        expect(claimInfo[0][2]).to.equal(false);

        expect(claimInfo[1][0]).to.equal(false);
        expect(claimInfo[1][1]).to.equal(ethers.parseEther("0"));
        expect(claimInfo[1][2]).to.equal(true);

        expect(claimInfo[2][0]).to.equal(false);
        expect(claimInfo[2][1]).to.equal(ethers.parseEther("0"));
        expect(claimInfo[2][2]).to.equal(true);

        expect(claimInfo[3][0]).to.equal(false);
        expect(claimInfo[3][1]).to.equal(ethers.parseEther("0"));
        expect(claimInfo[3][2]).to.equal(true);

    });


    it("Bid and claim test 1", async function () {
        await this.auctionMinterInstance.connect(this.accounts[1]).bid({value: ethers.parseEther("1")});
        blockTimestamp = (await ethers.provider.getBlock('latest')).timestamp;
        console.log("current ethers block timestamp ", blockTimestamp);
        console.log("current system time ",  Math.round(new Date().getTime() / 1000));
        await this.auctionMinterInstance.setAuctionEndTime(blockTimestamp+2);
        await new Promise(r => setTimeout(r, 2000));
        await this.genesisERC21Instance.grantRole(await this.genesisERC21Instance.MINTER_ROLE(), await this.auctionMinterInstance.getAddress())
        await this.auctionMinterInstance.connect(this.accounts[1]).claimAndRefund();
        const numNfts = await this.genesisERC21Instance.balanceOf(this.accounts[1]);
        expect(Number(numNfts)).to.equal(1);
    });
    
    it("Withdraw auction amount to receipient ", async function () {
        await this.auctionMinterInstance.connect(this.accounts[1]).bid({value: ethers.parseEther("2")});
        await this.auctionMinterInstance.connect(this.accounts[2]).bid({value: ethers.parseEther("3")});
        await this.auctionMinterInstance.setPrimarySaleRecipient(this.accounts[3]);
        const receipientCurrentBalance = await ethers.provider.getBalance(this.accounts[3]);
        console.log('Current Accout Balance of Receipient ', receipientCurrentBalance);
        blockTimestamp = (await ethers.provider.getBlock('latest')).timestamp;
        console.log("current ethers block timestamp ", blockTimestamp);
        await this.auctionMinterInstance.setAuctionEndTime(blockTimestamp+3);
        await new Promise(r => setTimeout(r, 3000));
        await this.auctionMinterInstance.sendPayment();
        expect(await ethers.provider.getBalance(this.accounts[3])).to.equal(receipientCurrentBalance + ethers.parseEther("5"));
    });

});    
