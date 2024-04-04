const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

describe("Escrow", () => {
  const TOKEN_ID_FIRST = 1;
  let { realEstate, escrow } = {};
  let [seller, inspector, lender, buyer] = [];

  beforeEach(async () => {
    [seller, inspector, lender, buyer] = await ethers.getSigners();

    // deploy REAL ESTATE contract
    const RealEstate = await ethers.getContractFactory("RealEstate");
    realEstate = await RealEstate.deploy();

    // deploy ESCROW contract
    const Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy(
      realEstate.address,
      seller.address,
      inspector.address,
      lender.address
    );

    // Mint
    let transaction = await realEstate
      .connect(seller)
      .mint(
        "https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS"
      );
    await transaction.wait();

    // Approve
    transaction = await realEstate
      .connect(seller)
      .approve(escrow.address, TOKEN_ID_FIRST);
    await transaction.wait();

    // List
    transaction = await escrow.connect(seller).list(TOKEN_ID_FIRST);
    await transaction.wait();
  });

  describe("Deployment", () => {
    it("Returns NFT address", async () => {
      const result = await escrow.nftAddress();
      expect(result).to.be.equal(realEstate.address);
    });

    it("Returns seller address", async () => {
      const result = await escrow.seller();
      expect(result).to.be.equal(seller.address);
    });

    it("Returns inspector address", async () => {
      const result = await escrow.inspector();
      expect(result).to.be.equal(inspector.address);
    });

    it("Returns lender address", async () => {
      const result = await escrow.lender();
      expect(result).to.be.equal(lender.address);
    });
  });

  describe("Listing", () => {
    it("Updates ownership", async () => {
      const ownerOfREAL_1 = await realEstate.ownerOf(TOKEN_ID_FIRST);
      expect(ownerOfREAL_1).to.be.equal(escrow.address);
    });

    it("Updates isListed", async () => {
      const isListed = await escrow.isListed(TOKEN_ID_FIRST);
      expect(isListed).to.be.equal(true);
    });
  });
});
