import { useEffect, useState } from "react";
import { ethers } from "ethers";

// Components
import Navigation from "./components/Navigation";
import Search from "./components/Search";
import Home from "./components/Home";

// ABIs
import RealEstate from "./abis/RealEstate.json";
import Escrow from "./abis/Escrow.json";

// Config
import config from "./config.json";

function App() {
  const [provider, setProvider] = useState(null);
  const [escrow, setEscrow] = useState(null);
  const [account, setAccount] = useState(null);
  const [homes, setHomes] = useState([]);
  const [home, setHome] = useState({});
  const [toggle, setToggle] = useState(false);
  const loadBlockchainData = async () => {
    if (window.ethereum === undefined) {
      throw new Error("please install Metamask");
    }
    const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
    setProvider(web3Provider);

    const network = await web3Provider.getNetwork();

    const realEstate = new ethers.Contract(
      config[network.chainId].realEstate.address,
      RealEstate,
      web3Provider
    );
    const totalSupply = Number((await realEstate.totalSupply()).toString());
    const metadatas = [];

    for (let i = 0; i < totalSupply; i++) {
      const uri = await realEstate.tokenURI(i + 1);
      const response = await fetch(uri);
      const metadata = await response.json();
      metadatas.push(metadata);
    }
    setHomes(metadatas);
    console.log(metadatas);

    const escrowContract = new ethers.Contract(
      config[network.chainId].escrow.address,
      Escrow,
      web3Provider
    );
    setEscrow(escrowContract);

    window.ethereum.on("accountsChanged", async () => {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const address = ethers.utils.getAddress(accounts[0]);
      setAccount(address);
    });
  };

  useEffect(() => {
    loadBlockchainData();
  }, []);

  const togglePop = (homeItem) => {
    setHome(homeItem);
    setToggle(!toggle);
  };
  return (
    <div>
      <Navigation account={account} setAccount={setAccount} />
      <Search />
      <div className="cards__section">
        <h3>Welcome to Millow</h3>

        <hr />

        <div className="cards">
          {homes.map((homeItem) => (
            <div
              className="card"
              key={homeItem.id}
              onClick={togglePop.bind(null, homeItem)}
            >
              <div className="card__image">
                <img src={homeItem.image} alt="Home" />
              </div>
              <div className="card__info">
                <h4>{homeItem.attributes[0].value} ETH</h4>
                <p>
                  <strong>{homeItem.attributes[1].value}</strong> |
                  <strong>{homeItem.attributes[2].value}</strong> bds |
                  <strong>{homeItem.attributes[3].value}</strong> ba |
                  <strong>{homeItem.attributes[4].value}</strong> sqft
                </p>
                <p>{homeItem.address}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {toggle && (
        <Home
          account={account}
          home={home}
          provider={provider}
          escrow={escrow}
          togglePop={togglePop}
        />
      )}
    </div>
  );
}

export default App;
