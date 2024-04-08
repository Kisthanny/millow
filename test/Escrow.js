const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

describe("Escrow", () => {
  const TOKEN_ID_FIRST = 1;
  const PURCHASE_PRICE = tokens(10);
  const ESCROW_AMOUNT = tokens(2);
  const LENDING_AMOUNT = PURCHASE_PRICE.sub(ESCROW_AMOUNT);
  const LESS_THAN_ESCROW = tokens(1);
  let { realEstate, escrow } = {};
  let [seller, inspector, lender, buyer, randomDude] = [];

  beforeEach(async () => {
    [seller, inspector, lender, buyer, randomDude] = await ethers.getSigners();

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
    transaction = await escrow
      .connect(seller)
      .list(TOKEN_ID_FIRST, PURCHASE_PRICE, ESCROW_AMOUNT, buyer.address);
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

    it("Returns purchasePrice", async () => {
      const purchasePrice = await escrow.purchasePrice(TOKEN_ID_FIRST);
      expect(purchasePrice).to.be.equal(PURCHASE_PRICE);
    });

    it("Returns escrowAmount", async () => {
      const escrowAmount = await escrow.escrowAmount(TOKEN_ID_FIRST);
      expect(escrowAmount).to.be.equal(ESCROW_AMOUNT);
    });

    it("Returns buyer", async () => {
      const _buyer = await escrow.buyer(TOKEN_ID_FIRST);
      expect(_buyer).to.be.equal(buyer.address);
    });

    it("Only Seller can list", async () => {
      //   List
      try {
        let _transaction = await escrow
          .connect(randomDude)
          .list(TOKEN_ID_FIRST, PURCHASE_PRICE, ESCROW_AMOUNT, buyer.address);
        await _transaction.wait();
      } catch (error) {
        expect(error.message).to.contain("revert");
        return;
      }

      expect.fail("Expected revert but no error was thrown");
    });
  });

  describe("Depositing", () => {
    it("Updates Contract Balance", async () => {
      let _transaction = await escrow
        .connect(buyer)
        .depositEarnest(TOKEN_ID_FIRST, { value: ESCROW_AMOUNT });
      await _transaction.wait();
      const balance = await escrow.getBalance();
      expect(balance).to.be.equal(ESCROW_AMOUNT);
    });

    it("Only Buyer can Deposit", async () => {
      //   Deposit
      try {
        let _transaction = await escrow
          .connect(randomDude)
          .depositEarnest(TOKEN_ID_FIRST);
        await _transaction.wait();
      } catch (error) {
        expect(error.message).to.contain("revert");
        return;
      }

      expect.fail("Expected revert but no error was thrown");
    });

    it("Only Sufficient Escrow Amount", async () => {
      //   Deposit
      try {
        let _transaction = await escrow
          .connect(buyer)
          .depositEarnest(TOKEN_ID_FIRST, { value: LESS_THAN_ESCROW });
        await _transaction.wait();
      } catch (error) {
        expect(error.message).to.contain("revert");
        return;
      }

      expect.fail("Expected revert but no error was thrown");
    });
  });

  describe("Inspecting", () => {
    it("Updates Inspection Status", async () => {
      let _transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(TOKEN_ID_FIRST, true);
      await _transaction.wait();
      const inspectionStatus = await escrow.inspectionPassed(TOKEN_ID_FIRST);
      expect(inspectionStatus).to.be.equal(true);
    });

    it("Only Inspector can Update Status", async () => {
      try {
        let _transaction = await escrow
          .connect(randomDude)
          .updateInspectionStatus(TOKEN_ID_FIRST, true);
        await _transaction.wait();
      } catch (error) {
        expect(error.message).to.contain("revert");
        return;
      }

      expect.fail("Expected revert but no error was thrown");
    });
  });

  describe("Approval", () => {
    it("Updates Approval Status", async () => {
      let _transaction = await escrow
        .connect(buyer)
        .approveSale(TOKEN_ID_FIRST);
      await _transaction.wait();
      _transaction = await escrow.connect(seller).approveSale(TOKEN_ID_FIRST);
      await _transaction.wait();
      _transaction = await escrow.connect(lender).approveSale(TOKEN_ID_FIRST);
      await _transaction.wait();
      expect(await escrow.approval(TOKEN_ID_FIRST, buyer.address)).to.be.equal(
        true
      );
      expect(await escrow.approval(TOKEN_ID_FIRST, seller.address)).to.be.equal(
        true
      );
      expect(await escrow.approval(TOKEN_ID_FIRST, lender.address)).to.be.equal(
        true
      );
    });
  });

  describe("Sell", () => {
    beforeEach(async () => {
      let transaction = await escrow
        .connect(buyer)
        .depositEarnest(TOKEN_ID_FIRST, { value: ESCROW_AMOUNT });
      await transaction.wait();

      transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(TOKEN_ID_FIRST, true);
      await transaction.wait();

      transaction = await escrow.connect(buyer).approveSale(TOKEN_ID_FIRST);
      await transaction.wait();
      transaction = await escrow.connect(seller).approveSale(TOKEN_ID_FIRST);
      await transaction.wait();
      transaction = await escrow.connect(lender).approveSale(TOKEN_ID_FIRST);
      await transaction.wait();

      await lender.sendTransaction({
        to: escrow.address,
        value: LENDING_AMOUNT,
      });

      transaction = await escrow.connect(seller).finalizeSale(TOKEN_ID_FIRST);
      await transaction.wait();
    });

    it("Updates Balance", async () => {
      const balance = await escrow.getBalance();
      expect(balance).to.be.equal(0);
    });
    it("Updates Ownership", async () => {
      const ownerOfREAL_1 = await realEstate.ownerOf(TOKEN_ID_FIRST);
      expect(ownerOfREAL_1).to.be.equal(buyer.address);
    });
  });
});
