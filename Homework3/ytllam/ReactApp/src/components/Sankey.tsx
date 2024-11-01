import { useEffect, useState, useContext, useRef } from 'react';
import * as d3 from 'd3';
import * as d3sankey from 'd3-sankey';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import DataContext from '../stores/DataContext.ts';

import { ComponentSize, DataRow } from '../types.ts';

export default function Sankey() {
  // Get data from context
  // const data = useContext(DataContext);

  const DUMMY_DATA = {
    "nodes": [
      {"column": "school", "id": "GP", "label": "Gabriel Pereira"},
      {"column": "school", "id": "MS", "label": "Mousinho Da Silveira"},
      {"column": "sex", "id": "F", "label": "Female"},
      {"column": "sex", "id": "M", "label": "Male"},
    ],
    "links": [
      {"source":"GP","target":"M","value":4},
      {"source":"GP","target":"F","value":2},
      {"source":"MS","target":"M","value":2},
      {"source":"MS","target":"F","value":2},
    ]
  };

  const sankeyData = DUMMY_DATA;

  const margin = { top: 100, right: 10, bottom: 100, left: 10 };
  const color = d3.scaleOrdinal(d3.schemeCategory10);

  // Component size, not window size. Depends on grid size.
  const [size, setSize] = useState<ComponentSize>({ width: 0, height: 0 });
  // const [sankey, setSankey] = useState<d3sankey.SankeyLayout<d3sankey.SankeyGraph<{}, {}>, {}, {}> | null>(null);

  // On window resize, call setSize with delay of 200 milliseconds
  const onResize = useDebounceCallback((size: ComponentSize) => setSize(size), 200)
  // If ref is created with useRef(null), React will map it to node in JSX on render.
  // Changes to ref (from d3) do not trigger rerenders.
  // Important: ref cannot be read while rendering, must be done in event handler or useEffect().
  const graphRef = useRef<HTMLDivElement>(null);
  useResizeObserver({ ref: graphRef, onResize });

  useEffect(() => {
    // if (isEmpty(data)) return;
    if (size.width === 0 || size.height === 0) return; // if component not rendered

    // Reset graph
    d3.select('#sankey-diagram-svg').selectAll('*').remove();

    renderGraph();
  }, [sankeyData, size]) // For some reason if we don't include size then data will not render.

  function renderGraph() {
    // Create a SVG container.
    let svg = d3.select('#sankey-diagram-svg').append('g');

    console.log("oldSankeyData", sankeyData)

    // Define and configure Sankey generator
    const sankey = d3sankey.sankey()
        .nodeId(d => d.id)
        .nodeWidth(15)
        .nodePadding(15)
        .extent([[margin.left, margin.top], [size.width - margin.right, size.height - margin.bottom]]);

    // Deep copy nodes/links so sankeyData is not mutated.
    // Doesn't matter for now since sankeyData is static, but may matter for stretch goal of changing columns.
    const transformedData = sankey({
      nodes: sankeyData.nodes.map(d => ({...d})),
      links: sankeyData.links.map(d => ({...d}))
    })

    console.log("newSankeyData", transformedData)

    // Render nodes
    const nodeRects = svg.append("g")
      .selectAll()
      .data(transformedData.nodes)
      .join("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => color(d.id));

    // Render links
    const linkPaths = svg.append("g")
      .selectAll()
      .data(transformedData.links)
      .join("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.4)
        .style("mix-blend-mode", "overlay")
      .append("path")
        .attr("d", d3sankey.sankeyLinkHorizontal())
        .attr("stroke", d => color(d.source.id)) // color flow by value of previous
        .attr("stroke-width", d => d.width);

    // TODO: add click to highlight/filter to nodes
    // Add tooltip to nodes.
    nodeRects.append("title")
    .text(d => `${d.label}\n${d.value}`);
    
    // TODO: add hover for highlight/value to links
    // Add tooltip to links.
    linkPaths.append("title")
    .text(d => `${d.target.label}\n${d.value}`);

    // Adds labels on the nodes.
    svg.append("g")
      .selectAll()
      .data(transformedData.nodes)
      .join("text")
        .attr("x", d => d.x0 < size.width / 2 ? d.x1 + 6 : d.x0 - 6)
        .attr("y", d => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < size.width / 2 ? "start" : "end")
        .text(d => d.label + ": " + d.value);
  }

  return (
    <>
      <div ref={graphRef} className='chart-container'>
        <svg id='sankey-diagram-svg' width='100%' height='100%'></svg>
      </div>
    </>
  )
}
