/**
 * 2D Full Network Graph - Shows all ingredients in a popup
 * Uses vis-network and matches 3D graph colors and theme
 */

let graph2DInstance = null;
let is2DInitialized = false;
let categoryMap2D = null;

// Category color mapping - matches 3D graph theme
function getCategoryColor2D(category) {
    const colorMap = {
        'Seafood': '#4de4ff',
        'Grains and Legumes': '#8aff80',
        'Condiments and Seasonings': '#ff62c0',
        'Vegetables': '#ffd93d',
        'Vegetables and Herbs': '#ffd93d',
        'Fruits': '#ff6b6b',
        'Meat': '#ff9f43',
        'Dairy': '#a29bfe',
        'Herbs and Spices': '#fd79a8',
        'Beverages': '#00b894',
        'Nuts and Seeds': '#fdcb6e',
        'Oils and Fats': '#e17055',
        'Grains': '#74b9ff',
        'Legumes': '#55efc4',
        'Unknown': '#95a5a6'
    };
    return colorMap[category] || colorMap['Unknown'];
}

/**
 * Load category mapping from network_data_hub.json
 */
async function loadCategoryMap2D() {
    if (categoryMap2D) return categoryMap2D;
    
    try {
        const response = await fetch('network_data_hub.json');
        const data = await response.json();
        categoryMap2D = data.categories || {};
        return categoryMap2D;
    } catch (error) {
        console.error('Error loading category map:', error);
        return {};
    }
}

/**
 * Get node color based on category
 */
function getNodeColor2D(nodeName) {
    const categoryInfo = categoryMap2D[nodeName];
    
    if (categoryInfo) {
        if (categoryInfo.color) {
            return categoryInfo.color;
        } else if (categoryInfo.category) {
            return getCategoryColor2D(categoryInfo.category);
        }
    }
    
    return '#95a5a6'; // Unknown category
}

/**
 * Initialize the 2D full network graph
 */
async function initialize2DGraph() {
    if (is2DInitialized && graph2DInstance) {
        console.log('2D graph already initialized');
        return;
    }
    
    const container = document.getElementById('flavor-2d-graph-container');
    if (!container) {
        console.error('2D graph container not found');
        return;
    }
    
    try {
        // Load category map
        await loadCategoryMap2D();
        
        // Load graph data
        const response = await fetch('ingr_ingr_hub.json');
        const graphData = await response.json();
        
        // Convert to vis-network format
        // Handle both {nodes, links} and direct array formats
        let nodesData = graphData.nodes || graphData;
        let linksData = graphData.links || [];
        
        // If graphData is an array, it might be links only
        if (Array.isArray(graphData) && graphData.length > 0 && graphData[0].source) {
            linksData = graphData;
            // Extract unique nodes from links
            const nodeSet = new Set();
            linksData.forEach(link => {
                nodeSet.add(link.source);
                nodeSet.add(link.target);
            });
            nodesData = Array.from(nodeSet).map(id => ({ id, name: id }));
        }
        
        const nodes = nodesData.map(node => {
            const nodeId = node.id || node.name || String(node);
            const nodeName = typeof node === 'string' ? node : (node.name || node.id || String(node));
            const displayName = String(nodeName).replace(/_/g, ' ');
            const color = getNodeColor2D(nodeName);
            
            return {
                id: nodeId,
                label: displayName,
                color: {
                    background: color,
                    border: color,
                    highlight: {
                        background: color,
                        border: color
                    },
                    hover: {
                        background: color,
                        border: color
                    }
                },
                size: 16,
                font: {
                    color: '#ffffff',
                    size: 12,
                    face: 'Rajdhani',
                    strokeWidth: 2,
                    strokeColor: '#000000'
                },
                borderWidth: 2,
                shadow: {
                    enabled: true,
                    color: color,
                    size: 15,
                    x: 0,
                    y: 0
                }
            };
        });
        
        const edges = linksData.map((link, index) => {
            const source = link.source || link.source_id || link[0];
            const target = link.target || link.target_id || link[1];
            return {
                id: `edge-${index}`,
                from: source,
                to: target,
                color: {
                    color: 'rgba(77, 228, 255, 0.3)',
                    highlight: 'rgba(77, 228, 255, 0.6)',
                    hover: 'rgba(77, 228, 255, 0.5)'
                },
                width: 1,
                smooth: {
                    type: 'continuous',
                    roundness: 0.5
                }
            };
        });
        
        // Create vis-network instance
        const data = {
            nodes: new vis.DataSet(nodes),
            edges: new vis.DataSet(edges)
        };
        
        const options = {
            nodes: {
                shape: 'dot',
                scaling: {
                    min: 12,
                    max: 24
                },
                font: {
                    size: 12,
                    face: 'Rajdhani',
                    color: '#ffffff',
                    strokeWidth: 2,
                    strokeColor: '#000000'
                }
            },
            edges: {
                width: 1,
                color: {
                    color: 'rgba(77, 228, 255, 0.3)',
                    highlight: 'rgba(77, 228, 255, 0.6)',
                    hover: 'rgba(77, 228, 255, 0.5)'
                },
                smooth: {
                    type: 'continuous',
                    roundness: 0.5
                }
            },
            physics: {
                enabled: true,
                stabilization: {
                    enabled: true,
                    iterations: 500,
                    fit: true
                },
                barnesHut: {
                    gravitationalConstant: -8000,
                    centralGravity: 0.01,
                    springLength: 400,
                    springConstant: 0.01,
                    damping: 0.5,
                    avoidOverlap: 2.0
                }
            },
            interaction: {
                hover: true,
                tooltipDelay: 200,
                zoomView: true,
                dragView: true
            }
        };
        
        graph2DInstance = new vis.Network(container, data, options);
        
        // After stabilization, apply even stronger separation settings
        graph2DInstance.once('stabilizationEnd', function() {
            graph2DInstance.setOptions({
                physics: {
                    enabled: true,
                    barnesHut: {
                        gravitationalConstant: -12000,
                        centralGravity: 0.005,
                        springLength: 500,
                        springConstant: 0.008,
                        damping: 0.7,
                        avoidOverlap: 3.0
                    }
                }
            });
        });
        
        // Add event listeners
        graph2DInstance.on('hoverNode', function(params) {
            container.style.cursor = 'pointer';
        });
        
        graph2DInstance.on('blurNode', function(params) {
            container.style.cursor = 'default';
        });
        
        is2DInitialized = true;
        console.log('✓ 2D full network graph initialized');
        
    } catch (error) {
        console.error('Error initializing 2D graph:', error);
    }
}

/**
 * Show the 2D graph popout
 */
async function show2DGraphPanel() {
    const popout = document.getElementById('2d-graph-popout');
    const overlay = document.getElementById('2d-graph-overlay');
    
    if (!popout || !overlay) {
        console.error('2D graph popout elements not found');
        return;
    }
    
    // Show header and close button
    const header = popout.querySelector('.graph-popout-header');
    const closeBtn = document.getElementById('close2DGraphBtn');
    if (header) header.style.display = 'flex';
    if (closeBtn) closeBtn.style.display = 'inline-flex';
    
    // Show overlay and popout
    overlay.classList.add('active');
    popout.classList.add('active');
    
    // Wait a bit for popout animation, then initialize graph
    setTimeout(async () => {
        // Initialize graph if not already done
        if (!is2DInitialized) {
            await initialize2DGraph();
        }
        
        // Resize graph when popout opens
        if (graph2DInstance) {
            const container = document.getElementById('flavor-2d-graph-container');
            if (container) {
                graph2DInstance.fit({
                    animation: {
                        duration: 500,
                        easingFunction: 'easeInOutQuad'
                    }
                });
            }
        }
    }, 100);
}

/**
 * Hide the 2D graph popout
 */
function hide2DGraphPanel() {
    const popout = document.getElementById('2d-graph-popout');
    const overlay = document.getElementById('2d-graph-overlay');
    
    // Hide header and close button
    const header = popout.querySelector('.graph-popout-header');
    const closeBtn = document.getElementById('close2DGraphBtn');
    if (header) header.style.display = 'none';
    if (closeBtn) closeBtn.style.display = 'none';
    
    if (popout) popout.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

/**
 * Handle window resize
 */
function handle2DResize() {
    if (graph2DInstance) {
        graph2DInstance.fit({
            animation: false
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for vis-network to load
        const checkVisNetwork = setInterval(() => {
            if (typeof vis !== 'undefined' && vis.Network) {
                clearInterval(checkVisNetwork);
                setup2DEventListeners();
            }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => {
            clearInterval(checkVisNetwork);
            setup2DEventListeners();
        }, 5000);
    });
} else {
    setup2DEventListeners();
}

function setup2DEventListeners() {
    // Open button
    const openBtn = document.getElementById('open2DGraphBtn');
    if (openBtn) {
        openBtn.addEventListener('click', show2DGraphPanel);
    }
    
    // Close button
    const closeBtn = document.getElementById('close2DGraphBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', hide2DGraphPanel);
    }
    
    // Overlay click to close
    const overlay = document.getElementById('2d-graph-overlay');
    if (overlay) {
        overlay.addEventListener('click', hide2DGraphPanel);
    }
    
    window.addEventListener('resize', handle2DResize);
}

