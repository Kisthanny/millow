import { ethers } from "ethers";
import { useEffect, useState } from "react";

import close from "../assets/close.svg";
import { formatAddress } from "../lib/utils";
const handleDetailsClick = (e) => {
  e.stopPropagation();
};
const Home = ({ home, provider, escrow, togglePop, account }) => {
  const [buyer, setBuyer] = useState(null);
  const [lender, setLender] = useState(null);
  const [inspector, setInspector] = useState(null);
  const [seller, setSeller] = useState(null);

  const [hasBought, setHasBought] = useState(false);
  const [hasSold, setHasSold] = useState(false);
  const [hasLoaned, setHasLoaned] = useState(false);
  const [inspectionPassed, setInspectionPassed] = useState(false);

  const [owner, setOwner] = useState(null);

  const fetchDetails = async () => {
    const resBuyer = await escrow.buyer(home.id);
    setBuyer(resBuyer);
    const resHasBought = await escrow.approval(home.id, resBuyer);
    setHasBought(resHasBought);

    const resSeller = await escrow.seller();
    setSeller(resSeller);
    const resHasSold = await escrow.approval(home.id, resSeller);
    setHasSold(resHasSold);

    const resLender = await escrow.lender();
    setLender(resLender);
    const resHasLoaned = await escrow.approval(home.id, resLender);
    setHasLoaned(resHasLoaned);

    const resInspector = await escrow.inspector();
    setInspector(resInspector);
    const resInspectionPassed = await escrow.inspectionPassed(home.id);
    setInspectionPassed(resInspectionPassed);
  };

  const fetchOwner = async () => {
    const isListed = await escrow.isListed(home.id);
    if (isListed) {
      return;
    }

    const resOwner = await escrow.buyer(home.id);
    setOwner(resOwner);
  };

  const buyHandler = async () => {
    const escrowAmount = await escrow.escrowAmount(home.id);
    const signer = await provider.getSigner();

    // Buyer approves
    let transaction = await escrow.connect(signer).approveSale(home.id);
    await transaction.wait();

    // Buyer deposit earnest
    transaction = await escrow
      .connect(signer)
      .depositEarnest(home.id, { value: escrowAmount });
    await transaction.wait();

    setHasBought(true);
  };
  const inspectHandler = async () => {
    const signer = await provider.getSigner();

    // Updates inspection status
    const transaction = await escrow
      .connect(signer)
      .updateInspectionStatus(home.id, true);
    await transaction.wait();

    setInspectionPassed(true);
  };
  const lendHandler = async () => {
    const signer = await provider.getSigner();

    // Lender approves
    let transaction = await escrow.connect(signer).approveSale(home.id);
    await transaction.wait();

    // Lender sends fund to contract
    const purchasePrice = await escrow.purchasePrice(home.id);
    const escrowAmount = await escrow.escrowAmount(home.id);
    const lendAmount = purchasePrice - escrowAmount;
    await signer.sendTransaction({
      to: escrow.address,
      value: lendAmount.toString(),
      gasLimit: 60000,
    });
    setHasLoaned(true);
  };
  const sellHandler = async () => {
    const signer = await provider.getSigner();

    // Seller approves
    let transaction = await escrow.connect(signer).approveSale(home.id);
    await transaction.wait();

    // Seller finalize the sale
    transaction = await escrow.connect(signer).finalizeSale(home.id);
    await transaction.wait();

    setHasSold(true);
  };

  const RoleButton = () => {
    if (owner) {
      return <div className="home__owned">Owned by {formatAddress(owner)}</div>;
    }
    const roleMap = {
      [inspector]: (
        <button
          className="home__buy"
          onClick={inspectHandler}
          disabled={inspectionPassed}
        >
          Approve Inspection
        </button>
      ),
      [lender]: (
        <button
          className="home__buy"
          onClick={lendHandler}
          disabled={hasLoaned}
        >
          Approve & Lend
        </button>
      ),
      [seller]: (
        <button className="home__buy" onClick={sellHandler} disabled={hasSold}>
          Approve & Sell
        </button>
      ),
    };
    const buyButton = (
      <button className="home__buy" onClick={buyHandler} disabled={hasBought}>
        Buy
      </button>
    );
    // return roleMap[account] || buyButton;
    return (
      <div>
        {roleMap[account] || buyButton}
        <button className="home__contact">Contact agent</button>
      </div>
    );
  };

  useEffect(() => {
    fetchDetails();
    fetchOwner();
  }, [hasSold]);
  return (
    <div className="home" onClick={togglePop}>
      <div className="home__details" onClick={handleDetailsClick}>
        <div className="home__image">
          <img src={home.image} alt="Home" />
        </div>
        <div className="home__overview">
          <h1>{home.name}</h1>
          <p>
            <strong>{home.attributes[2].value}</strong> bds |
            <strong>{home.attributes[3].value}</strong> ba |
            <strong>{home.attributes[4].value}</strong> sqft
          </p>
          <p>{home.address}</p>

          <h2>{home.attributes[0].value} ETH</h2>

          <RoleButton />

          <hr />

          <h2>Overview</h2>

          <p>{home.description}</p>

          <hr />

          <h2>Facts and features</h2>

          <ul>
            {home.attributes.map((attribute, index) => (
              <li key={`${home.id}-${index}-attibute`}>
                <strong>{attribute.trait_type}</strong> : {attribute.value}
              </li>
            ))}
          </ul>
        </div>
        <button type="button" className="home__close" onClick={togglePop}>
          <img src={close} alt="Close" />
        </button>
      </div>
    </div>
  );
};

export default Home;
