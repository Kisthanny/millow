import logo from "../assets/logo.svg";

const Navigation = ({ account, setAccount }) => {
  const connectHandler = async () => {
    if (account) {
      return;
    }
    if (window.ethereum === undefined) {
      throw new Error("please install Metamask");
    }
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    setAccount(accounts[0]);
  };
  const formatAccount = () => {
    if (!account) {
      return "";
    }
    return `${account.slice(0, 6)}...${account.slice(-4)}`;
  };
  return (
    <nav>
      <ul className="nav__links">
        <li>
          <a href="#">Buy</a>
        </li>
        <li>
          <a href="#">Rent</a>
        </li>
        <li>
          <a href="#">Sell</a>
        </li>
      </ul>

      <div className="nav__brand">
        <img src={logo} alt="Logo" />
        <h1>Millow</h1>
      </div>

      <button type="button" className="nav__connect" onClick={connectHandler}>
        {formatAccount() || "Connect"}
      </button>
    </nav>
  );
};

export default Navigation;
