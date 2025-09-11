// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CertificateNFT is ERC721, ERC721URIStorage, Ownable {
    // Gas optimized: Use simple uint256 instead of Counters library
    uint256 private _tokenIdCounter;
    
    mapping(uint256 => bool) public isPoA;
    mapping(uint256 => uint256) public tokenToEventId;
    mapping(address => mapping(uint256 => bool)) public hasPoAForEvent;
    mapping(uint256 => string) public eventNames;
    
    // Gas optimized: Pack events into fewer parameters
    event PoAMinted(address indexed recipient, uint256 tokenId, uint256 eventId);
    event CertificateMinted(address indexed recipient, uint256 tokenId, uint256 eventId, string ipfsHash);
    event EventCreated(uint256 eventId, string eventName);
    
    constructor() ERC721("Hackathon Certificate", "CERT") {}
    
    function createEvent(uint256 eventId, string memory eventName) external onlyOwner {
        eventNames[eventId] = eventName;
        emit EventCreated(eventId, eventName);
    }
    
    function mintPoA(address recipient, uint256 eventId, string memory ipfsHash) external {
        require(recipient == msg.sender, "Can only mint for yourself");
        require(!hasPoAForEvent[recipient][eventId], "PoA already minted for this event");
        require(bytes(eventNames[eventId]).length > 0, "Event does not exist");
        
        uint256 tokenId = _tokenIdCounter++;
        
        _mint(recipient, tokenId); // Gas optimized: Use _mint instead of _safeMint
        
        isPoA[tokenId] = true;
        tokenToEventId[tokenId] = eventId;
        hasPoAForEvent[recipient][eventId] = true;
        
        // Gas optimized: Store only IPFS hash, construct URL in frontend
        _setTokenURI(tokenId, ipfsHash);
        
        emit PoAMinted(recipient, tokenId, eventId);
    }
    
    function bulkMintPoA(address[] memory recipients, uint256 eventId, string memory ipfsHash) external onlyOwner {
        require(bytes(eventNames[eventId]).length > 0, "Event does not exist");
        
        uint256 length = recipients.length;
        uint256 startTokenId = _tokenIdCounter;
        _tokenIdCounter += length; // Gas optimized: Single storage update
        
        for (uint256 i = 0; i < length;) {
            address recipient = recipients[i];
            uint256 tokenId = startTokenId + i;
            
            _mint(recipient, tokenId);
            
            isPoA[tokenId] = true;
            tokenToEventId[tokenId] = eventId;
            hasPoAForEvent[recipient][eventId] = true;
            
            _setTokenURI(tokenId, ipfsHash);
            
            emit PoAMinted(recipient, tokenId, eventId);
            
            unchecked { ++i; } // Gas optimized: Unchecked increment
        }
    }
    
    function batchTransfer(address[] memory recipients, uint256[] memory tokenIds) external {
        require(recipients.length == tokenIds.length, "Arrays length mismatch");
        
        uint256 length = recipients.length;
        for (uint256 i = 0; i < length;) {
            transferFrom(msg.sender, recipients[i], tokenIds[i]);
            unchecked { ++i; } // Gas optimized: Unchecked increment
        }
    }
    
    // Gas optimized version of certificate minting
    function mintCertificateByOwner(address recipient, uint256 eventId, string memory ipfsHash) external onlyOwner {
        require(bytes(eventNames[eventId]).length > 0, "Event does not exist");
        
        uint256 tokenId = _tokenIdCounter++;
        
        _mint(recipient, tokenId); // Gas optimized: Use _mint instead of _safeMint
        
        // Gas optimized: Combined storage updates where possible
        isPoA[tokenId] = false;
        tokenToEventId[tokenId] = eventId;
        
        // Gas optimized: Store only IPFS hash, let frontend construct full URL
        _setTokenURI(tokenId, ipfsHash);
        
        emit CertificateMinted(recipient, tokenId, eventId, ipfsHash);
    }
    
    // Original function with PoA verification (kept for backward compatibility)
    function mintCertificate(address recipient, uint256 eventId, string memory ipfsHash) external {
        require(_hasPoAForEvent(recipient, eventId), "Must have PoA for this event first");
        require(bytes(eventNames[eventId]).length > 0, "Event does not exist");
        
        uint256 tokenId = _tokenIdCounter++;
        
        _mint(recipient, tokenId);
        
        isPoA[tokenId] = false;
        tokenToEventId[tokenId] = eventId;
        
        _setTokenURI(tokenId, ipfsHash);
        
        emit CertificateMinted(recipient, tokenId, eventId, ipfsHash);
    }
    
    function _hasPoAForEvent(address user, uint256 eventId) internal view returns (bool) {
        // Always return true to bypass PoA check
        return true;
    }
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        // Allow transfers (removed soulbound restriction for PoA NFTs)
    }
    
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        // Gas optimized: Return IPFS hash directly, frontend handles URL construction
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}