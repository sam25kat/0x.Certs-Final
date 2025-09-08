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
        
        uint256 tokenId = _mintPoAInternal(recipient, eventId);
        emit PoAMinted(recipient, tokenId, eventId);
    }
    
    function bulkMintPoA(address[] memory recipients, uint256 eventId) external {
        require(bytes(eventNames[eventId]).length > 0, "Event does not exist");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            address recipient = recipients[i];
            // Remove duplicate check to allow organizer to receive multiple tokens
            uint256 tokenId = _mintPoAInternal(recipient, eventId);
            emit PoAMinted(recipient, tokenId, eventId);
        }
    }
    
    function _mintPoAInternal(address recipient, uint256 eventId) internal returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(recipient, tokenId);
        
        isPoA[tokenId] = true;
        tokenToEventId[tokenId] = eventId;
        hasPoAForEvent[recipient][eventId] = true;
        
        // Create dynamic metadata with event name
        string memory eventName = eventNames[eventId];
        string memory nftName = string(abi.encodePacked(eventName, " - PoA"));
        string memory description = string(abi.encodePacked("Proof of Attendance for ", eventName));
        
        // Create JSON metadata (simplified, but includes event name)
        string memory jsonMetadata = string(abi.encodePacked(
            '{"name":"', nftName, 
            '","description":"', description,
            '","attributes":[{"trait_type":"Type","value":"PoA"},{"trait_type":"Event","value":"', eventName, '"}]}'
        ));
        
        // Convert to base64
        string memory base64JSON = _base64Encode(bytes(jsonMetadata));
        string memory finalURI = string(abi.encodePacked("data:application/json;base64,", base64JSON));
        
        _setTokenURI(tokenId, finalURI);
        
        return tokenId;
    }
    
    function batchTransfer(address[] memory recipients, uint256[] memory tokenIds) external {
        require(recipients.length == tokenIds.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(ownerOf(tokenIds[i]) == msg.sender, "Not token owner");
            _transfer(msg.sender, recipients[i], tokenIds[i]);
        }
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
    
    // Base64 encoding function
    function _base64Encode(bytes memory data) internal pure returns (string memory) {
        if (data.length == 0) return "";
        
        string memory table = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        uint256 encodedLen = 4 * ((data.length + 2) / 3);
        string memory result = new string(encodedLen + 32);
        
        assembly {
            let tablePtr := add(table, 1)
            let dataPtr := data
            let endPtr := add(dataPtr, mload(data))
            let resultPtr := add(result, 32)
            
            for {} lt(dataPtr, endPtr) {}
            {
                dataPtr := add(dataPtr, 3)
                let input := mload(dataPtr)
                
                mstore8(resultPtr, mload(add(tablePtr, and(shr(18, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(12, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(shr(6, input), 0x3F))))
                resultPtr := add(resultPtr, 1)
                mstore8(resultPtr, mload(add(tablePtr, and(input, 0x3F))))
                resultPtr := add(resultPtr, 1)
            }
            
            switch mod(mload(data), 3)
            case 1 { mstore(sub(resultPtr, 2), shl(240, 0x3d3d)) }
            case 2 { mstore(sub(resultPtr, 1), shl(248, 0x3d)) }
            
            mstore(result, encodedLen)
        }
        
        return result;
    }
}