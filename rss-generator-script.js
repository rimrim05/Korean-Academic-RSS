const fetch = require('node-fetch');
const xml2js = require('xml2js');
const fs = require('fs');

// Back to separate KAIST and SNU feeds for better institution tracking
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
                if (isNaN(pubDate.getTime())) {
                    pubDate = new Date();
                }
            } catch (e) {
                pubDate = new Date();
            }

            // Extract PMID from URL (for deduplication)
            const pmid = extractPMID(item.link);
            
            return {
                title: item.title || 'No title',
                link: item.link || '',
                description: item.description || '',
                pubDate: pubDate,
                source: feed.name,
                pmid: pmid,
                guid: item.link || item.guid || ''
            };
        }).filter(item => item.title && item.link);
        
    } catch (error) {
        console.error(`Error fetching ${feed.name} feed:`, error.message);
        return [];
    }
}

function extractPMID(url) {
    // Extract PMID from PubMed URL
    // Example: https://pubmed.ncbi.nlm.nih.gov/12345678/ -> 12345678
    const match = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/);
    return match ? match[1] : null;
}

function combineAndDeduplicate(allFeeds) {
    const paperMap = new Map();
    
    // Process each feed
    allFeeds.forEach(feedItems => {
        feedItems.forEach(item => {
            const key = item.pmid || item.link; // Use PMID if available, otherwise URL
            
            if (paperMap.has(key)) {
                // Paper already exists - add this institution to its tags
                const existingPaper = paperMap.get(key);
                if (!existingPaper.institutions.includes(item.source)) {
                    existingPaper.institutions.push(item.source);
                    existingPaper.institutions.sort(); // Keep consistent order
                }
            } else {
                // New paper - create entry with initial institution
                const newPaper = {
                    ...item,
                    institutions: [item.source]
                };
                paperMap.set(key, newPaper);
            }
        });
    });
    
    return Array.from(paperMap.values());
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
        
        console.log(`Raw items from feeds: ${results.map((r, i) => `${feeds[i].name}: ${r.length}`).join(', ')}`);
        
        // Combine and deduplicate
        let allItems = combineAndDeduplicate(results);
        
        // Sort by date
        allItems.sort((a, b) => b.pubDate - a.pubDate);
        
        console.log(`After deduplication: ${allItems.length} unique items`);
        console.log(`Multi-institutional papers: ${allItems.filter(item => item.institutions.length > 1).length}`);
        
        // Limit to 100 items
        allItems = allItems.slice(0, 100);
        
        const baseUrl = 'https://rimrim05.github.io/Korean-Academic-RSS/';
        
        // Generate RSS XML
        const rssContent = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
        <title>KAIST &amp; SNU Publications</title>
        <description>Latest research from KAIST and Seoul National University (deduplicated)</description>
        <link>${baseUrl}</link>
        <atom:link href="${baseUrl}feed.xml" rel="self" type="application/rss+xml" />
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <language>en-us</language>
        <ttl>360</ttl>
        
        ${allItems.map(item => `
        <item>
            <title><![CDATA[${item.title}]]></title>
            <link>${escapeXml(item.link)}</link>
            <description><![CDATA[${item.description}]]></description>
            <pubDate>${item.pubDate.toUTCString()}</pubDate>
            <guid isPermaLink="true">${escapeXml(item.link)}</guid>
            <category>${item.institutions.join(', ')}</category>
        </item>`).join('')}
    </channel>
</rss>`;

        fs.writeFileSync('feed.xml', rssContent);
        console.log('RSS feed generated successfully!');
        
        // Generate enhanced statistics
        const institutionStats = {
            'KAIST': allItems.filter(item => item.institutions.includes('KAIST')).length,
            'SNU': allItems.filter(item => item.institutions.includes('SNU')).length,
            'Both KAIST & SNU': allItems.filter(item => item.institutions.includes('KAIST') && item.institutions.includes('SNU')).length
        };

        // Generate JSON feed
        const jsonFeed = {
            title: "KAIST & SNU Publications",
            description: "Latest research from KAIST and Seoul National University (deduplicated)",
            lastBuildDate: new Date().toISOString(),
            totalItems: allItems.length,
            institutionBreakdown: institutionStats,
            items: allItems.map(item => ({
                title: item.title,
                link: item.link,
                description: item.description,
                pubDate: safeToISOString(item.pubDate),
                institutions: item.institutions,
                pmid: item.pmid
            }))
        };
        
        fs.writeFileSync('feed.json', JSON.stringify(jsonFeed, null, 2));
        console.log('JSON feed generated successfully!');
        
        // Generate statistics
        const stats = {
            lastUpdate: new Date().toISOString(),
            totalItems: allItems.length,
            institutionBreakdown: institutionStats,
            multiInstitutional: allItems.filter(item => item.institutions.length > 1).length,
            latestItem: allItems.length > 0 ? {
                title: allItems[0].title || 'No title',
                date: safeToISOString(allItems.pubDate),
                institutions: allItems.institutions || ['Unknown']
            } : null
        };
        
        fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));
        console.log('Statistics generated successfully!');
        
    } catch (error) {
        console.error('Error generating RSS:', error);
        process.exit(1);
    }
}

generateRSS();
