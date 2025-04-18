// ==UserScript==
// @name         Aephia Flipside Enhancer
// @namespace    http://tampermonkey.net/
// @version      0.0.4
// @description  Enhance Aephia dashboards on Flipside by replacing public keys with display names using GM_xmlhttpRequest to fetch the lookup file.
// @match        https://flipsidecrypto.xyz/Aephia/*
// @downloadURL  https://raw.githubusercontent.com/222TheMaster222/aephia-flipside-enhancer/main/aephia-flipside-enhancer.user.js
// @updateURL    https://raw.githubusercontent.com/222TheMaster222/aephia-flipside-enhancer/main/aephia-flipside-enhancer.user.js
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // URL of the lookup JSON file hosted on GitHub.
    const lookupUrl = "https://raw.githubusercontent.com/222TheMaster222/aephia-flipside-enhancer/main/lookup.json";

    /**
     * Scans all table cells and replaces matching public keys with display names.
     * @param {Object} lookupData - Mapping of public keys to display names.
     */
    function updatePlayerNames(lookupData) {
        const tds = document.querySelectorAll("td");
        tds.forEach(td => {
            const trimmedText = td.textContent.trim();
            if (lookupData.hasOwnProperty(trimmedText)) {
                td.textContent = lookupData[trimmedText];
            }
        });
    }

    /**
     * Updates text nodes that follow a format like "{publicKey}: {value}".
     * The code assumes that the candidate public key is the text before the first colon.
     * @param {Object} lookupData - Mapping of public keys to display names.
     */
    function updateTextNodes(lookupData) {
        // Use a TreeWalker to iterate over text nodes.
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        let node;
        while (node = walker.nextNode()) {
            if (node.nodeValue && node.nodeValue.includes(":")) {
                // Find the first colon.
                const colonIndex = node.nodeValue.indexOf(":");
                // Consider the part before the colon as a candidate key.
                const candidate = node.nodeValue.substring(0, colonIndex).trim();
                if (lookupData.hasOwnProperty(candidate)) {
                    // Replace candidate with the display name while keeping the remainder of the text unchanged.
                    const replacement = lookupData[candidate];
                    node.nodeValue = replacement + node.nodeValue.substring(colonIndex);
                }
            }
        }
    }

    /**
     * Fetch the lookup data using GM_xmlhttpRequest.
     */
    function fetchLookupData() {
        GM_xmlhttpRequest({
            method: "GET",
            url: lookupUrl,
            onload: function (response) {
                if (response.status === 200) {
                    try {
                        let lookupData = JSON.parse(response.responseText);
                        // Initial update on page load.
                        updatePlayerNames(lookupData);
                        updateTextNodes(lookupData);

                        // Set up a MutationObserver to update dynamically loaded content.
                        const observer = new MutationObserver(() => {
                            updatePlayerNames(lookupData);
                            updateTextNodes(lookupData);
                        });
                        observer.observe(document.body, { childList: true, subtree: true });
                    } catch (e) {
                        console.error("Error parsing lookup data:", e);
                    }
                } else {
                    console.error("Failed to fetch lookup data. Status:", response.status);
                }
            },
            onerror: function (err) {
                console.error("GM_xmlhttpRequest error:", err);
            }
        });
    }

    // Run the data fetching function.
    fetchLookupData();
})();
