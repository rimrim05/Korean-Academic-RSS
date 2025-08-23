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
                if (isNaN(pubDate.getTime())) {
                    pubDate = new Date();
                }
            } catch (e) {
                pubDate = new Date();
            }

            // Extract PMID from URL
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
    const match = url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/);
    return match ? match[1] : null;
}

function combineAndDeduplicate(allFeeds) {
    const paperMap = new Map();
    
    allFeeds.forEach(feedItems => {
        feedItems.forEach(item => {
            const key = item.pmid || item.link;
            
            if (paperMap.has(key)) {
                const existingPaper = paperMap.get(key);
                if (!existingPaper.institutions.includes(item.source)) {
                    existingPaper.institutions.push(item.source);
                    existingPaper.institutions.sort();
                }
            } else {
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

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

function loadExistingArchive() {
    const archivePath = 'papers-archive.csv';
    try {
        if (fs.existsSync(archivePath)) {
            const csvContent = fs.readFileSync(archivePath, 'utf8');
            const lines = csvContent.split('\n');
            
            // Parse existing papers (skip header)
            return lines.slice(1)
                .filter(line => line.trim())
                .map(line => {
                    const values = parseCSVLine(line);
                    return {
                        institutions: values[0] || '',
                        date: values[11] || '',
                        title: values[12] || '',
                        link: values[13] || '',
                        pmid: extractPMID(values[13] || '')
                    };
                });
        }
    } catch (error) {
        console.log('No existing archive found:', error.message);
    }
    return [];
}

function saveAccumulatingArchive(newPapers) {
    // Load existing papers
    const existingPapers = loadExistingArchive();
    
    // Create map to avoid duplicates
    const existingMap = new Set();
    existingPapers.forEach(paper => {
        const key = paper.pmid || paper.link;
        if (key) existingMap.add(key);
    });
    
    // Add only new papers
    let addedCount = 0;
    const papersToAdd = [];
    
    newPapers.forEach(paper => {
        const key = paper.pmid || paper.link;
        if (key && !existingMap.has(key)) {
            papersToAdd.push({
                institutions: paper.institutions.join(' & '),
                date: paper.pubDate.toISOString().split('T')[0],
                title: paper.title,
                link: paper.link
            });
            addedCount++;
        }
    });
    
    // Combine all papers (new papers first, then existing)
    const allPapers = [...papersToAdd, ...existingPapers];
    
    // Generate CSV content
    const csvHeaders = 'Institutions,Date,Title,Link\n';
    const csvContent = csvHeaders + allPapers.map(paper => {
        const institutions = `"${paper.institutions}"`;
        const date = `"${paper.date}"`;
        const title = `"${paper.title.replace(/"/g, '""')}"`;  // Escape quotes properly
        const link = `"${paper.link}"`;
        return `${institutions},${date},${title},${link}`;
    }).join('\n');
    
    // Save to file
    fs.writeFileSync('papers-archive.csv', csvContent);
    
    console.log(`Archive updated: ${addedCount} new papers added, ${allPapers.length} total archived`);
    return { added: addedCount, total: allPapers.length };
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
    console.log('Starting RSS generation with accumulating archive...');
    
    try {
        // Fetch new papers from RSS feeds
        const feedPromises = feeds.map(feed => fetchFeed(feed));
        const results = await Promise.all(feedPromises);
        
        let allItems = combineAndDeduplicate(results);
        allItems.sort((a, b) => b.pubDate - a.pubDate);
        
        console.log(`Found ${allItems.length} current items from RSS feeds`);
        
        // Save to accumulating archive (this keeps ALL papers forever)
        const archiveStats = saveAccumulatingArchive(allItems);
        
        // Limit display items to 100 most recent for website performance
        const displayItems = allItems.slice(0, 100);
        
        const baseUrl = 'https://rimrim05.github.io/Korean-Academic-RSS/';
        
        // Generate RSS XML (for current items only)
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
        
        ${displayItems.map(item => `
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

        // Enhanced statistics
        const institutionBreakdown = {
            'KAIST': displayItems.filter(item => item.institutions.includes('KAIST')).length,
            'SNU': displayItems.filter(item => item.institutions.includes('SNU')).length,
            'Both KAIST & SNU': displayItems.filter(item => item.institutions.includes('KAIST') && item.institutions.includes('SNU')).length
        };

        // Generate JSON feed (for website display)
        const jsonFeed = {
            title: "KAIST & SNU Publications",
            description: "Latest research from KAIST and Seoul National University (deduplicated)",
            lastBuildDate: new Date().toISOString(),
            totalItems: displayItems.length,
            totalArchived: archiveStats.total,
            newPapersAdded: archiveStats.added,
            institutionBreakdown: institutionBreakdown,
            items: displayItems.map(item => ({
                title: item.title,
                link: item.link,
                description: item.description,
                pubDate: safeToISOString(item.pubDate),
                institutions: item.institutions,
                pmid: item.pmid
            }))
        };
        
        fs.writeFileSync('feed.json', JSON.stringify(jsonFeed, null, 2));

        // Generate statistics
        const stats = {
            lastUpdate: new Date().toISOString(),
            totalItems: displayItems.length,
            totalArchived: archiveStats.total,
            newPapersAdded: archiveStats.added,
            institutionBreakdown: institutionBreakdown,
            multiInstitutional: displayItems.filter(item => item.institutions.length > 1).length,
            latestItem: displayItems.length > 0 ? {
                title: displayItems[0].title || 'No title',
                date: safeToISOString(displayItems.pubDate),
                institutions: displayItems.institutions || ['Unknown']
            } : null
        };
        
        fs.writeFileSync('stats.json', JSON.stringify(stats, null, 2));
        
        console.log('✅ RSS feed generated successfully!');
        console.log('✅ JSON feed generated successfully!');
        console.log('✅ Statistics generated successfully!');
        console.log(`✅ Archive updated: ${archiveStats.added} new papers added, ${archiveStats.total} total archived`);
        
    } catch (error) {
        console.error('❌ Error generating RSS:', error);
        process.exit(1);
    }
}

generateRSS();
