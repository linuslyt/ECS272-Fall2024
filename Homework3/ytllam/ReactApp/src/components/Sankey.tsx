import { useEffect, useState, useContext, useRef } from 'react';
import * as d3 from 'd3';
import * as d3sankey from 'd3-sankey';
import { isEmpty } from 'lodash';
import { useResizeObserver, useDebounceCallback } from 'usehooks-ts';
import DataContext from '../stores/DataContext.ts';

import { ComponentSize, DataRow } from '../types.ts';

export default function Sankey() {
  // Get data from context
  const data = useContext(DataContext);
  // map column name to its possible values
  // TODO: make column groups and define their labels/values.
  // Use "id" for the value since the "value" key is used by d3-sankey.
  const COLUMN_ENUMS = {
    "sex": [{"id": "M", "label": "male"}, {"id": "F", "label": "female"}],
    "school": [{"id": "GP", "label": "Gabriel Pereira"}, {"id": "MS", "label": "Mousinho Da Silveira"}],
  }

  const SELECTED_COLUMNS = [
    'school',
    'sex',
  ];

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
    
    const nodes = SELECTED_COLUMNS.flatMap(c => (COLUMN_ENUMS[c].map(colEnum => ({"column": c, ...colEnum}))));
    console.log("nodes", nodes);
    
    const links = SELECTED_COLUMNS.flatMap((_, i) => {
      // There are N-1 links of consecutive columns for N columns. e.g. for columns [col1, col2, col3], links are [[col1, col2], [col2, col3]]
      if (i + 1 > SELECTED_COLUMNS.length - 1) return [];

      let fromCol = SELECTED_COLUMNS[i];
      let toCol = SELECTED_COLUMNS[i+1];
      let fromSet = COLUMN_ENUMS[fromCol].map(colEnum => colEnum.id);
      let toSet = COLUMN_ENUMS[toCol].map(colEnum => colEnum.id);

      return d3.cross(fromSet, toSet).map(pair => ({
        "source": pair[0],
        "target": pair[1],
        "value": data.reduce((count, row) => (row[fromCol] == pair[0] && row[toCol] == pair[1]) ? count + 1 : count, 0)
      }));
    });
    console.log("links", links);

    renderGraph([...nodes], [...links]);
  }, [data, size]) // For some reason if we don't include size then data will not render.

  function renderGraph(nodes, links) {

    // console.log("oldSankeyData", sankeyData)

    // Define and configure Sankey generator
    const sankey = d3sankey.sankey()
        .nodeId(d => d.id)
        .nodeWidth(15)
        .nodePadding(15)
        .extent([[margin.left, margin.top], [size.width - margin.right, size.height - margin.bottom]]);

    // Deep copy nodes/links so sankeyData is not mutated.
    // Doesn't matter for now since sankeyData is static, but may matter for stretch goal of changing columns.
    const transformedData = sankey({
      nodes: nodes.map(d => ({...d})),
      links: links.map(d => ({...d}))
    })

    let svg = d3.select('#sankey-diagram-svg').append('g');

    // Render nodes
    const nodeRects = svg.append("g")
      .selectAll()
      .data(transformedData.nodes)
      .join("rect")
        .attr("x", n => n.x0)
        .attr("y", n => n.y0)
        .attr("height", n => n.y1 - n.y0)
        .attr("width", n => n.x1 - n.x0)
        .attr("fill", n => color(n.id));

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
        .attr("stroke", l => color(l.source.id)) // color flow by value of previous
        .attr("stroke-width", l => l.width);

    // TODO: add click to highlight/filter to nodes
    // Add tooltip to nodes.
    nodeRects.append("title")
    .text(n => `${n.label}\n${n.value}`);
    
    // TODO: add hover for highlight/value to links
    // Add tooltip to links.
    linkPaths.append("title")
    .text(l => `${l.target.label}\n${l.value}`);

    // Adds labels on the nodes.
    svg.append("g")
      .selectAll()
      .data(transformedData.nodes)
      .join("text")
        .attr("x", n => n.x0 < size.width / 2 ? n.x1 + 6 : n.x0 - 6)
        .attr("y", n => (n.y1 + n.y0) / 2)
        .attr("dy", "0.35em")
        // TODO: keep labels on right side but add enough margin/padding to not overflow
        .attr("text-anchor", n => n.x0 < size.width / 2 ? "start" : "end")
        .text(n => n.label + ": " + n.value);
  }

  return (
    <>
      <div ref={graphRef} className='chart-container'>
        <svg id='sankey-diagram-svg' width='100%' height='100%'></svg>
      </div>
    </>
  )
}
