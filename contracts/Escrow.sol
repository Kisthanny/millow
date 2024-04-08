//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Strings.sol";

interface IERC721 {
    function transferFrom(address _from, address _to, uint256 _id) external;
}

contract Escrow {
    using Strings for uint256;

    address public nftAddress;
    address payable public seller;
    address public inspector;
    address public lender;

    mapping(uint256 => bool) public isListed;
    mapping(uint256 => uint256) public purchasePrice;
    mapping(uint256 => uint256) public escrowAmount;
    mapping(uint256 => address) public buyer;
    mapping(uint256 => bool) public inspectionPassed;
    mapping(uint256 => mapping(address => bool)) public approval;

    enum Comparator {
        GT,
        LT,
        EQ
    }

    modifier onlySeller() {
        require(msg.sender == seller, "only seller can list");
        _;
    }

    modifier onlyBuyer(uint256 _nftID) {
        require(msg.sender == buyer[_nftID], "only buyer can deposit");
        _;
    }

    modifier onlyInspector() {
        require(msg.sender == inspector, "only inspector can deposit");
        _;
    }

    modifier valueThreshold(Comparator _comparator, uint256 _purchasePrice) {
        string memory _priceString = uint2str(_purchasePrice);
        if (_comparator == Comparator.GT) {
            require(msg.value >= _purchasePrice, "INSUFFICIENT AMOUNT");
            _;
        } else if (_comparator == Comparator.LT) {
            string memory errorMessage = "AMOUNT SHOULD BE LESS THAN ";
            require(
                msg.value <= _purchasePrice,
                concatenateStrings(errorMessage, _priceString)
            );
            _;
        } else {
            string memory errorMessage = "AMOUNT SHOULD BE EXACTLY ";
            require(
                msg.value == _purchasePrice,
                concatenateStrings(errorMessage, _priceString)
            );
            _;
        }
    }

    function uint2str(uint256 _num) internal pure returns (string memory) {
        if (_num == 0) {
            return "0";
        }
        uint256 j = _num;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory result = new bytes(length);
        uint256 k = length;
        j = _num;
        while (j != 0) {
            result[--k] = bytes1(uint8(48 + (j % 10)));
            j /= 10;
        }
        return string(result);
    }

    function concatenateStrings(
        string memory _str1,
        string memory _str2
    ) internal pure returns (string memory) {
        return string(abi.encodePacked(_str1, _str2));
    }

    constructor(
        address _nftAddress,
        address payable _seller,
        address _inspector,
        address _lender
    ) {
        nftAddress = _nftAddress;
        seller = _seller;
        inspector = _inspector;
        lender = _lender;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {}

    function list(
        uint256 _nftID,
        uint256 _purchasePrice,
        uint256 _escrowAmount,
        address _buyer
    ) public payable onlySeller {
        IERC721(nftAddress).transferFrom(msg.sender, address(this), _nftID);

        isListed[_nftID] = true;
        purchasePrice[_nftID] = _purchasePrice;
        escrowAmount[_nftID] = _escrowAmount;
        buyer[_nftID] = _buyer;
        inspectionPassed[_nftID] = false;
    }

    function depositEarnest(
        uint256 _nftID
    )
        public
        payable
        onlyBuyer(_nftID)
        valueThreshold(Comparator.GT, escrowAmount[_nftID])
    {}

    function updateInspectionStatus(
        uint256 _nftID,
        bool _passed
    ) public onlyInspector {
        inspectionPassed[_nftID] = _passed;
    }

    function approveSale(uint256 _nftID) public {
        approval[_nftID][msg.sender] = true;
    }

    // Finalize Sale
    // -> Require inspection status (add more items here, like appraisal)
    // -> Require sale to be authorized
    // -> Require funds to be correct amount
    // -> Transfer NFT to buyer
    // -> Transfer Funds to Seller
    function finalizeSale(uint256 _nftID) public onlySeller {
        // -> Require inspection status
        require(
            inspectionPassed[_nftID],
            "this property has not passed the inspection yet, please contact the inspector"
        );

        // -> Require sale to be authorized
        require(approval[_nftID][seller], "you have not approved the sale yet");
        require(
            approval[_nftID][buyer[_nftID]],
            "buyer has not approved the sale yet"
        );
        require(
            approval[_nftID][lender],
            "lender has not approved the sale yet"
        );

        // -> Require fully funded
        require(getBalance() >= purchasePrice[_nftID], "not fully funded");

        // -> Transfer Funds to Seller
        (bool success, ) = payable(seller).call{value: address(this).balance}(
            ""
        );
        require(success);

        // -> Transfer NFT to buyer
        IERC721(nftAddress).transferFrom(address(this), buyer[_nftID], _nftID);

        isListed[_nftID] = false;
    }

    function cancelSale(uint256 _nftID) public {
        if (inspectionPassed[_nftID] == false) {
            payable(buyer[_nftID]).transfer(address(this).balance);
        } else {
            payable(seller).transfer(address(this).balance);
        }
    }
}
