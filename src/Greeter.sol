// SPDX-License-Identifier: ISC
pragma solidity ^0.8.19;

contract Greeter {
    string private _greeting = "Hello, World!";

    function greet() public view returns (string memory) {
        return _greeting;
    }

    function setGreeting(string memory greeting_) public {
        _greeting = greeting_;
    }
}