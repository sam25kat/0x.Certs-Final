// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract CertificateNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIdCounter;
    
    mapping(uint256 => bool) public isPoA;
    mapping(uint256 => uint256) public tokenToEventId;
    mapping(address => mapping(uint256 => bool)) public hasPoAForEvent;
    mapping(uint256 => string) public eventNames;
    
    event PoAMinted(address indexed recipient, uint256 tokenId, uint256 eventId);
    event CertificateMinted(address indexed recipient, uint256 tokenId, uint256 eventId, string ipfsHash);
    event EventCreated(uint256 eventId, string eventName);
    
    constructor() ERC721("Hackathon Certificate", "CERT") {}
    
    function createEvent(uint256 eventId, string memory eventName) external onlyOwner {
        eventNames[eventId] = eventName;
        emit EventCreated(eventId, eventName);
    }
    
    function mintPoA(address recipient, uint256 eventId) external {
        require(recipient == msg.sender, "Can only mint for yourself");
        require(!hasPoAForEvent[recipient][eventId], "PoA already minted for this event");
        require(bytes(eventNames[eventId]).length > 0, "Event does not exist");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(recipient, tokenId);
        
        isPoA[tokenId] = true;
        tokenToEventId[tokenId] = eventId;
        hasPoAForEvent[recipient][eventId] = true;
        
        string memory defaultURI = string(abi.encodePacked(
            "data:application/json;base64,eyJuYW1lIjoiUHJvb2Ygb2YgQXR0ZW5kYW5jZSIsImRlc2NyaXB0aW9uIjoiSGFja2F0aG9uIFByb29mIG9mIEF0dGVuZGFuY2UgTkZUIiwiYXR0cmlidXRlcyI6W3sidHJhaXRfdHlwZSI6IlR5cGUiLCJ2YWx1ZSI6IlBvQSJ9XX0="
        ));
        _setTokenURI(tokenId, defaultURI);
        
        emit PoAMinted(recipient, tokenId, eventId);
    }
    
    function mintCertificate(address recipient, uint256 eventId, string memory ipfsHash) external onlyOwner {
        require(hasPoAForEvent[recipient][eventId], "Must have PoA for this event first");
        require(bytes(eventNames[eventId]).length > 0, "Event does not exist");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(recipient, tokenId);
        
        isPoA[tokenId] = false;
        tokenToEventId[tokenId] = eventId;
        
        string memory uri = string(abi.encodePacked("ipfs://", ipfsHash));
        _setTokenURI(tokenId, uri);
        
        emit CertificateMinted(recipient, tokenId, eventId, ipfsHash);
    }
    
    function updateMetadata(uint256 tokenId, string memory ipfsHash) external onlyOwner {
        require(_exists(tokenId), "Token does not exist");
        string memory uri = string(abi.encodePacked("ipfs://", ipfsHash));
        _setTokenURI(tokenId, uri);
    }
    
    function getTokensByOwner(address owner) external view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(owner);
        uint256[] memory tokens = new uint256[](tokenCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < _tokenIdCounter.current(); i++) {
            if (_exists(i) && ownerOf(i) == owner) {
                tokens[index] = i;
                index++;
            }
        }
        
        return tokens;
    }
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        require(from == address(0) || to == address(0), "Soulbound: Transfer not allowed");
    }
    
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}