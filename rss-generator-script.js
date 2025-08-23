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

            // Extract enhanced information
            const enhancedInfo = extractEnhancedInfo(item.title, item.description);
            
            return {
                title: item.title || 'No title',
                link: item.link || '',
                description: item.description || '',
                pubDate: pubDate,
                source: feed.name,
                pmid: extractPMID(item.link),
                guid: item.link || item.guid || '',
                // Enhanced fields
                journal: enhancedInfo.journal,
                objective: enhancedInfo.objective,
                significance: enhancedInfo.significance,
                conclusion: enhancedInfo.conclusion
            };
        }).filter(item => item.title && item.link);
        
    } catch (error) {
        console.error(`Error fetching ${feed.name} feed:`, error.message);
        return [];
    }
}

function extractEnhancedInfo(title, description) {
    if (!description) {
        return {
            journal: null,
            objective: null,
            significance: null,
            conclusion: null
        };
    }

    const desc = description.toLowerCase();
    
    // Extract journal name (common patterns)
    let journal = null;
    const journalPatterns = [
        /published in ([^.]+)/i,
        /from ([a-z\s&]+journal[^.]*)/i,
        /in ([^,]+), \d{4}/i,
        /(nature|science|cell|lancet|jama|nejm|pnas|plos|frontiers|journal of|international journal|european journal|american journal)[^.]+/i
    ];
    
    for (const pattern of journalPatterns) {
        const match = description.match(pattern);
        if (match) {
            journal = match[1] || match;
            journal = journal.replace(/^(in|from|published in)\s+/i, '').trim();
            break;
        }
    }
    
    // Extract objective/aim
    let objective = null;
    const objectivePatterns = [
        /(?:objective|aim|purpose|goal)s?[:\s]+([^.]+)/i,
        /this study (?:aimed to|sought to|investigated|examined|analyzed)\s+([^.]+)/i,
        /we (?:aimed to|sought to|investigated|examined|analyzed)\s+([^.]+)/i,
        /the (?:purpose|goal|aim|objective) (?:of this study )?(?:was|is) to\s+([^.]+)/i
    ];
    
    for (const pattern of objectivePatterns) {
        const match = description.match(pattern);
        if (match && match[1]) {
            objective = match[1].trim();
            if (objective.length > 200) {
                objective = objective.substring(0, 200) + '...';
            }
            break;
        }
    }
    
    // Extract significance
    let significance = null;
    const significancePatterns = [
        /(?:significance|important|implications?|impact)[:\s]+([^.]+)/i,
        /this (?:finding|result|study) (?:suggests?|indicates?|shows?|demonstrates?)\s+([^.]+)/i,
        /these (?:findings?|results?) (?:suggest|indicate|show|demonstrate)\s+([^.]+)/i,
        /clinical significance[:\s]+([^.]+)/i,
        /implications? for\s+([^.]+)/i
    ];
    
    for (const pattern of significancePatterns) {
        const match = description.match(pattern);
        if (match && match[1]) {
            significance = match[1].trim();
            if (significance.length > 200) {
                significance = significance.substring(0, 200) + '...';
            }
            break;
        }
    }
    
    // Extract conclusion
    let conclusion = null;
    const conclusionPatterns = [
        /conclusions?[:\s]+([^.]+(?:\.[^.]+)?)/i,
        /in conclusion[,\s]+([^.]+)/i,
        /we conclude (?:that\s+)?([^.]+)/i,
        /our (?:findings?|results?|study) (?:suggest|indicate|show|demonstrate)\s+([^.]+)/i
    ];
    
    for (const pattern of conclusionPatterns) {
        const match = description.match(pattern);
        if (match && match[1]) {
            conclusion = match[1].trim();
            if (conclusion.length > 300) {
                conclusion = conclusion.substring(0, 300) + '...';
            }
            break;
        }
    }
    
    return {
        journal: journal ? journal.substring(0, 100) : null,
        objective,
        significance,
        conclusion
    };
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

// ... (keep all your existing helper functions: parseCSVLine, loadExistingArchive, saveAccumulatingArchive, etc.)

async function generateRSS() {
    console.log('Starting RSS generation with enhanced data extraction...');
    
    try {
        // Fetch new papers from RSS feeds
        const feedPromises = feeds.map(feed => fetchFeed(feed));
        const results = await Promise.all(feedPromises);
        
        let allItems = combineAndDeduplicate(results);
        allItems.sort((a, b) => b.pubDate - a.pubDate);
        
        console.log(`Found ${allItems.length} current items from RSS feeds`);
        
        // Save to accumulating archive (enhanced CSV)
        const archiveStats = saveEnhancedArchive(allItems);
        
        // Limit display items to 100 most recent
        const displayItems = allItems.slice(0, 100);
        
        // Generate enhanced JSON feed
        const jsonFeed = {
            title: "KAIST & SNU Publications",
            description: "Latest research from KAIST and Seoul National University (deduplicated with enhanced details)",
            lastBuildDate: new Date().toISOString(),
            totalItems: displayItems.length,
            totalArchived: archiveStats.total,
            newPapersAdded: archiveStats.added,
            institutionBreakdown: {
                'KAIST': displayItems.filter(item => item.institutions.includes('KAIST')).length,
                'SNU': displayItems.filter(item => item.institutions.includes('SNU')).length,
                'Both KAIST & SNU': displayItems.filter(item => item.institutions.includes('KAIST') && item.institutions.includes('SNU')).length
            },
            items: displayItems.map(item => ({
                title: item.title,
                link: item.link,
                description: item.description,
                pubDate: safeToISOString(item.pubDate),
                institutions: item.institutions,
                pmid: item.pmid,
                // Enhanced fields
                journal: item.journal,
                objective: item.objective,
                significance: item.significance,
                conclusion: item.conclusion
            }))
        };
        
        fs.writeFileSync('feed.json', JSON.stringify(jsonFeed, null, 2));
        
        // ... (rest of your existing RSS and stats generation)
        
        console.log('✅ Enhanced RSS feed generated successfully!');
        
    } catch (error) {
        console.error('❌ Error generating RSS:', error);
        process.exit(1);
    }
}

function saveEnhancedArchive(newPapers) {
    // Enhanced CSV with additional columns
    const existingPapers = loadExistingArchive();
    
    const existingMap = new Set();
    existingPapers.forEach(paper => {
        const key = paper.pmid || paper.link;
        if (key) existingMap.add(key);
    });
    
    let addedCount = 0;
    const papersToAdd = [];
    
    newPapers.forEach(paper => {
        const key = paper.pmid || paper.link;
        if (key && !existingMap.has(key)) {
            papersToAdd.push({
                institutions: paper.institutions.join(' & '),
                date: paper.pubDate.toISOString().split('T')[0],
                title: paper.title,
                journal: paper.journal || '',
                objective: paper.objective || '',
                significance: paper.significance || '',
                link: paper.link
            });
            addedCount++;
        }
    });
    
    const allPapers = [...papersToAdd, ...existingPapers];
    
    // Enhanced CSV headers
    const csvHeaders = 'Institutions,Date,Title,Journal,Objective,Significance,Link\n';
    const csvContent = csvHeaders + allPapers.map(paper => {
        const institutions = `"${paper.institutions}"`;
        const date = `"${paper.date}"`;
        const title = `"${paper.title.replace(/"/g, '""')}"`;
        const journal = `"${(paper.journal || '').replace(/"/g, '""')}"`;
        const objective = `"${(paper.objective || '').replace(/"/g, '""')}"`;
        const significance = `"${(paper.significance || '').replace(/"/g, '""')}"`;
        const link = `"${paper.link}"`;
        return `${institutions},${date},${title},${journal},${objective},${significance},${link}`;
    }).join('\n');
    
    fs.writeFileSync('papers-archive.csv', csvContent);
    console.log(`Enhanced archive updated: ${addedCount} new papers added, ${allPapers.length} total archived`);
    
    return { added: addedCount, total: allPapers.length };
}

// ... (keep all other helper functions)

generateRSS();
