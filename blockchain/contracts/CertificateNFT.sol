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
    
    function mintPoA(address recipient, uint256 eventId, string memory ipfsHash) external {
        require(recipient == msg.sender, "Can only mint for yourself");
        require(!hasPoAForEvent[recipient][eventId], "PoA already minted for this event");
        require(bytes(eventNames[eventId]).length > 0, "Event does not exist");
        
        uint256 tokenId = _mintPoAInternal(recipient, eventId, ipfsHash);
        emit PoAMinted(recipient, tokenId, eventId);
    }
    
    function bulkMintPoA(address[] memory recipients, uint256 eventId, string memory ipfsHash) external {
        require(bytes(eventNames[eventId]).length > 0, "Event does not exist");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            address recipient = recipients[i];
            // Remove duplicate check to allow organizer to receive multiple tokens
            uint256 tokenId = _mintPoAInternal(recipient, eventId, ipfsHash);
            emit PoAMinted(recipient, tokenId, eventId);
        }
    }
    
    function _mintPoAInternal(address recipient, uint256 eventId, string memory ipfsHash) internal returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(recipient, tokenId);
        
        isPoA[tokenId] = true;
        tokenToEventId[tokenId] = eventId;
        hasPoAForEvent[recipient][eventId] = true;
        
        // Use dynamic IPFS metadata (same as POC certificates)
        string memory uri = string(abi.encodePacked("https://gateway.pinata.cloud/ipfs/", ipfsHash));
        _setTokenURI(tokenId, uri);
        
        return tokenId;
    }
    
    function batchTransfer(address[] memory recipients, uint256[] memory tokenIds) external {
        require(recipients.length == tokenIds.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(ownerOf(tokenIds[i]) == msg.sender, "Not token owner");
            _transfer(msg.sender, recipients[i], tokenIds[i]);
        }
    }
    
    function mintCertificate(address recipient, uint256 eventId, string memory ipfsHash) external {
        require(bytes(eventNames[eventId]).length > 0, "Event does not exist");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(recipient, tokenId);
        
        isPoA[tokenId] = false;
        tokenToEventId[tokenId] = eventId;
        
        // Use full HTTPS URL for better wallet compatibility
        string memory uri = string(abi.encodePacked("https://gateway.pinata.cloud/ipfs/", ipfsHash));
        _setTokenURI(tokenId, uri);
        
        emit CertificateMinted(recipient, tokenId, eventId, ipfsHash);
    }
    
    function mintCertificateByOwner(address recipient, uint256 eventId, string memory ipfsHash) external onlyOwner {
        require(bytes(eventNames[eventId]).length > 0, "Event does not exist");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(recipient, tokenId);
        
        isPoA[tokenId] = false;
        tokenToEventId[tokenId] = eventId;
        
        // Use full HTTPS URL for better wallet compatibility
        string memory uri = string(abi.encodePacked("https://gateway.pinata.cloud/ipfs/", ipfsHash));
        _setTokenURI(tokenId, uri);
        
        emit CertificateMinted(recipient, tokenId, eventId, ipfsHash);
    }
    
    // function updateMetadata(uint256 tokenId, string memory ipfsHash) external onlyOwner {
    //     require(_ownerOf(tokenId) != address(0), "Token does not exist");
    //     string memory uri = string(abi.encodePacked("https://gateway.pinata.cloud/ipfs/", ipfsHash));
    //     _setTokenURI(tokenId, uri);
    // }
    
    function _hasPoAForEvent(address user, uint256 eventId) internal view returns (bool) {
        // Always return true to bypass PoA check
        return true;
    }
    
    // function getTokensByOwner(address owner) external view returns (uint256[] memory) {
    //     uint256 tokenCount = balanceOf(owner);
    //     uint256[] memory tokens = new uint256[](tokenCount);
    //     uint256 index = 0;
        
    //     for (uint256 i = 0; i < _tokenIdCounter.current(); i++) {
    //         try this.ownerOf(i) returns (address tokenOwner) {
    //             if (tokenOwner == owner) {
    //                 tokens[index] = i;
    //                 index++;
    //             }
    //         } catch {
    //             // Token doesn't exist, continue
    //             continue;
    //         }
    //     }
        
    //     return tokens;
    // }
    
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
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}