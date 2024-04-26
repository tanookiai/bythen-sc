// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

interface ISignatureMintERC721 {
    /**
     *  @notice The body of a request to mint tokens.
     *
     *  @param to The receiver of the tokens to mint.
     *  @param quantity The quantity of tokens to mint.
     *  @param pricePerToken The price to pay per quantity of tokens minted.
     *  @param validityStartTimestamp The unix timestamp after which the payload is valid.
     *  @param validityEndTimestamp The unix timestamp at which the payload expires.
     *  @param uid A unique identifier for the payload.
     */
    struct MintRequest {
        address to;
        uint256 quantity;
        uint256 pricePerToken;
        uint256 validityStartTimestamp;
        uint256 validityEndTimestamp;
        bytes32 uid;
    }

    /// @dev Emitted when tokens are minted.
    event GenesisTokensMintedWithSignature(
        address indexed signer,
        address indexed mintedTo,
        uint256 indexed tokenIdMinted,
        MintRequest mintRequest
    );

    event GenesisTokensMinted(
        address indexed mintedTo,
        uint256 indexed tokenIdMinted
    );

    event GenesisTokensBurned(
        uint256 indexed tokenIdBurned
    );

    /**
     *  @notice Mints tokens according to the provided mint request.
     *
     *  @param req The payload / mint request.
     *  @param signature The signature produced by an account signing the mint request.
     */
    function mintWithSignature(
        MintRequest calldata req,
        bytes calldata signature
    ) external payable returns (address signer);

    function mint(address to) external;

    function burn(uint256 tokenId) external;

    function setAllowedToListorBurn(bool value) external;

}
