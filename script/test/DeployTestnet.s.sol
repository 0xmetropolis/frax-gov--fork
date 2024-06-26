// SPDX-License-Identifier: ISC
pragma solidity ^0.8.19;

import { TimelockController } from "@openzeppelin/contracts/governance/TimelockController.sol";
import { BaseScript } from "frax-std/BaseScript.sol";
import { console } from "frax-std/FraxTest.sol";
import { Constants } from "script/Constants.sol";
import { Greeter } from "../../src/Greeter.sol";
import {
    deployFraxGovernorAlpha,
    deployFraxGovernorOmega,
    deployFraxGuard,
    deployTimelockController,
    deployVeFxsVotingDelegation
} from "script/DeployFraxGovernance.s.sol";
import "test/mock/FxsMock.sol";

contract DeployTestnet is BaseScript {
    function run()
        external
        broadcaster
        returns (address payable _address, bytes memory _constructorParams, string memory _contractName)
    {
        Greeter greeter = new Greeter();
        greeter.setGreeting("later gator");

        (address _addressVoting, bytes memory _constructorParamsVoting, ) = deployVeFxsVotingDelegation(
            Constants.ARBITRUM_TEST_MOCK_VE_FXS
        );
        console.log("_constructorParamsVoting:", string(abi.encode(_constructorParamsVoting)));
        console.logBytes(_constructorParamsVoting);
        console.log("_addressVoting:", _addressVoting);

        (address payable _addressTimelock, bytes memory _constructorParamsTimelock, ) = deployTimelockController(
            deployer
        );
        console.log("_constructorParamsTimelock:", string(abi.encode(_constructorParamsTimelock)));
        console.logBytes(_constructorParamsTimelock);
        console.log("_addressTimelock:", _addressTimelock);

        (_address, _constructorParams, _contractName) = deployFraxGovernorAlpha(
            Constants.ARBITRUM_TEST_MOCK_VE_FXS,
            _addressVoting,
            _addressTimelock
        );
        console.log("_constructorParams:", string(abi.encode(_constructorParams)));
        console.logBytes(_constructorParams);
        console.log("_address:", _address);

        TimelockController tc = TimelockController(_addressTimelock);

        tc.grantRole(tc.PROPOSER_ROLE(), _address);
        tc.grantRole(tc.EXECUTOR_ROLE(), _address);
        tc.grantRole(tc.CANCELLER_ROLE(), _address);
        tc.renounceRole(tc.TIMELOCK_ADMIN_ROLE(), deployer);

        address[] memory _safeAllowlist = new address[](1);
        _safeAllowlist[0] = Constants.ARBITRUM_TEST_MULTISIG_FINAL9;

        (address _addressOmega, bytes memory _constructorParamsOmega, ) = deployFraxGovernorOmega(
            Constants.ARBITRUM_TEST_MOCK_VE_FXS,
            _addressVoting,
            _safeAllowlist,
            _addressTimelock
        );
        console.log("_constructorParamsOmega:", string(abi.encode(_constructorParamsOmega)));
        console.logBytes(_constructorParamsOmega);
        console.log("_addressOmega:", _addressOmega);

        (address _addressGuard, bytes memory _constructorParamsGuard, ) = deployFraxGuard(_addressOmega);
        console.log("_constructorParamsGuard:", string(abi.encode(_constructorParamsGuard)));
        console.logBytes(_constructorParamsGuard);
        console.log("_addressGuard:", _addressGuard);
    }
}
