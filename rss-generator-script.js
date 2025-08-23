const fetch = require('node-fetch');
const xml2js = require('xml2js');
const fs = require('fs');

// RSS feed URLs
const feeds = [
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1lGTpA7S74whuNVC_kQy0F4ncgCxeB9B9U0hbi6Wldiv2cIgV2/?limit=50&utm_campaign=pubmed-2&fc=20250822163126',
        name: 'KAIST'
    },
    {
        url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/1bo4uOs-bB_ZLOeoRMDuMyKrqOCTTJrR8i4c8aBDtpAcbJ09ch/?limit=50&utm_campaign=pubmed-2&fc=20250822163228',
        name: 'SNU'
    }
];

async function fetchFeed(feed) {
    try {
        console.log(`Fetching ${feed.name} feed...`);
        const response = await fetch(feed.url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const xmlData = await response.text();
        
        const parser = new xml2js.Parser({
            explicitArray: false,
            mergeAttrs: true,
            normalize: true,
            normalizeTags: true,
            trim: true
        });
        
        const result = await parser.parseStringPromise(xmlData);
        
        if (!result.rss || !result.rss.channel || !result.rss.channel.item) {
            console.log(`No items found in ${feed.name} feed`);
            return [];
        }
        
        const items = Array.isArray(result.rss.channel.item) 
            ? result.rss.channel.item 
            : [result.rss.channel.item];
        
        return items.map(item => {
            // Robust date parsing
            let pubDate;
            try {
                const dateStr = item.pubdate || item.pubDate || item.pubdate;
                pubDate = dateStr ? new Date(dateStr) : new Date();
                // Check if date is valid
                if (isNaN(pubDate.getTime())) {
                    pubDate = new Date();
                }
            } catch (e) {
                pubDate = new Date();
            }
            
            return {
                title: item.title || 'No title',
                link: item.link || '',
                description: item.description || '',
                pubDate: pubDate,
                source: feed.name,
                guid: item.link || item.guid || ''
            };
        }).filter(item => item.title && item.link);
        
    } catch (error) {
        console.error(`Error fetching ${feed.name} feed:`, error.message);
        return [];
    }
}

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString().replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

function safeToISOString(date) {
    try {
        if (!date) return new Date().toISOString();
        return date instanceof Date ? date.toISOString() : new Date(date).toISOString();
    } catch (e) {
        return new Date().toISOString();
    }
}

async function generateRSS() {
    console.log('Starting RSS generation...');
    
    try {
        // Fetch all feeds
        const feedPromises = feeds.map(feed => fetchFeed(feed));
        const results = await Promise.all(feedPromises);
        
        // Combine and sort all items
        let allItems = results.flat().sort((a, b) => b.pubDate - a.pubDate);
        
        console.log(`Found ${allItems.length} total items`);
        
        // Limit to 50 items
        allItems = allItems.slice(0, 50);
        
        // Get your actual GitHub Pages URL
        const baseUrl = 'https://rimrim05.github.io/Korean-Academic-RSS/';
        
        // Generate RSS XML
        const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>KAIST &amp; SNU Publications</title>
        <description>Combined academic publications from KAIST and SNU</description>
        <link>${baseUrl}</link>
        <atom:link href="${baseUrl}feed.xml" rel="self" type="application/rss+xml" />
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <language>en-us</language>
        <ttl>360</ttl>
        
        ${allItems.map(item => `
        <item>
            <title><![CDATA[${item.title} (${item.source})]]></title>
            <link>${escapeXml(item.link)}</link>
            <description><![CDATA[${item.description}]]></description>
            <pubDate>${item.pubDate.toUTCString()}</pubDate>
            <guid isPermaLink="true">${escapeXml(item.link)}</guid>
        </item>`).join('')}
    </channel>
</rss>`;

        // Write RSS file
        fs.writeFileSync('feed.xml', rssContent);
        console.log('RSS feed generated successfully!');
        
        // Generate JSON feed
        const jsonFeed = {
            title: "KAIST & SNU Publications",
            description: "Combined academic publications from KAIST and SNU",
            lastBuildDate: new Date().toISOString(),
            totalItems: allItems.length,
            items: allItems.map(item => ({
                title: `${item.title} (${item.source})`,
                link: item.link,
                description: item.description,
                pubDate: safeToISOString(item.pubDate),
                source: item.source
            }))
        };
        
        fs.writeFileSync('feed.json', JSON.stringify(jsonFeed, null, 2));
        console.log('JSON feed generated successfully!');
        
        // Generate statistics with bulletproof error handling
        const kaistCount = allItems.filter(item => item.source === 'KAIST').length;
        const snuCount = allItems.filter(item => item.source === 'SNU').length;
        
        const stats = {
            lastUpdate: new Date().toISOString(),
            totalItems: allItems.length,
            sources: {
                KAIST: kaistCount,
                SNU: snuCount
            },
            latestItem: allItems.length > 0 ? {
                title: allItems[0].title || 'No title',
                date: safeToISOString(allItems.pubDate),
                source: allItems.source || 'Unknown'
            } : null
        };
        
        fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));
        console.log('Statistics generated successfully!');
        
    } catch (error) {
        console.error('Error generating RSS:', error);
        process.exit(1);
    }
}

// Run the generator
generateRSS();
