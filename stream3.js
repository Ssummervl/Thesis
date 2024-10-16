// Define margins and dimensions of graph container
const margin = { top: 20, right: 30, bottom: 50, left: 40 },
  width = 860 - margin.left - margin.right,
  height = 420 - margin.top - margin.bottom;

// Split the chart into three sections
const sectionHeight = height / 3; // Divide the height into three equal parts

// Append the SVG object to the body
const svg = d3
  .select("#my_dataviz")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Append defs for the gradient backgrounds (Add the gradient code here)
const defs = svg.append("defs");

  // Define a gradient for the health section
  const gradientHealth = defs
    .append("linearGradient")
    .attr("id", "gradientHealth")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%")
    // Add color stops for Health. FF8C00 - orange
    gradientHealth
    .append("stop")
    .attr("offset", "5%")
    .attr("stop-color", "#ebebeb"); // Top, orange
    gradientHealth
    .append("stop")
    .attr("offset", "50%")
    .attr("stop-color", "#535353"); // Middle, green
    gradientHealth
    .append("stop")
    .attr("offset", "95%")
    .attr("stop-color", "#ebebeb"); // Bottom, Grey


  // Define a gradient for the sleep section
    const gradientSleep = defs
    .append("linearGradient")
    .attr("id", "gradientSleep")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%");
    // Add color stops for Sleep
    gradientSleep
    .append("stop")
    .attr("offset", "5%")
    .attr("stop-color", "#CBC3E3"); // Start with light blue
    gradientSleep
    .append("stop")
    .attr("offset", "50%")
    .attr("stop-color", "#301934"); // End with blue
    gradientSleep
    .append("stop")
    .attr("offset", "95%")
    .attr("stop-color", "#CBC3E3"); // End with blue

  // Define a gradient for the exercise section
    const gradientExercise = defs
    .append("linearGradient")
    .attr("id", "gradientExercise")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "0%")
    .attr("y2", "100%");
    // Add color stops for Exercise
    gradientExercise
    .append("stop")
    .attr("offset", "5%")
    .attr("stop-color", "#c7cbe6"); // Start with yellow
    gradientExercise
    .append("stop")
    .attr("offset", "50%")
    .attr("stop-color", "#3D468B"); // End with dark yellow
    gradientExercise
    .append("stop")
    .attr("offset", "95%")
    .attr("stop-color", "#c7cbe6"); // End with dark yellow


// Add background rectangles with the gradients
svg
  .append("rect")
  .attr("x", 0)
  .attr("y", height - sectionHeight)
  .attr("width", width)
  .attr("height", sectionHeight)
  .style("fill", "url(#gradientHealth)");

svg
  .append("rect")
  .attr("x", 0)
  .attr("y", height - 2 * sectionHeight)
  .attr("width", width)
  .attr("height", sectionHeight)
  .style("fill", "url(#gradientSleep)");

svg
  .append("rect")
  .attr("x", 0)
  .attr("y", height - 3 * sectionHeight)
  .attr("width", width)
  .attr("height", sectionHeight)
  .style("fill", "url(#gradientExercise)");

// Create a tooltip div and set its initial style to be hidden
const tooltip = d3
  .select("#my_dataviz")
  .append("div")
  .style("position", "absolute")
  .style("visibility", "hidden")
  .style("padding", "10px")
  .style("background-color", "#fff")
  .style("border", "1px solid #ccc")
  .style("border-radius", "5px")
  .style("font-size", "13px")
  .style("text-align", "left")
  .style("pointer-events", "none")
  .style("transition", "opacity 0.1s ease-in-out")  // Add smooth transition
  .style("opacity", 0); // Start hidden

// Add a vertical line to the SVG that will follow the mouse
  const verticalLine = svg
  .append("line")
  .attr("stroke", "#000") // Line color
  .attr("stroke-width", 1)
  .style("opacity", 0); // Initially hidden


d3.csv("data.csv").then((fileData) => {
  const data = fileData.filter((row) =>
    Object.values(row).some((value) => value !== null && value !== "")
  );
  data.forEach((d) => {
    d.Days = +d.Days;
    d.Health = +d.Health;
    d.Sleep = +d.Sleep;
    d.Exercise = +d.Exercise;
  });

  // X-axis: shared for all variables
  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, (d) => d.Days))
    .range([0, width]);

  svg
    .append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(
      d3.axisBottom(x).tickSize(-height).tickValues([1, 5, 10, 15, 20, 25, 30])
    )
    .select(".domain")
    .remove();

  svg.selectAll(".tick line").attr("stroke", "#b8b8b8");

  svg
    .append("text")
    .attr("text-anchor", "end")
    .style("font-size", "12px")
    .attr("x", width)
    .attr("y", height + 30)
    .text("Days");

  // Stack the data for each variable separately
  const keys = ["Health", "Sleep", "Exercise"];

  const stackHealth = d3
    .stack()
    .offset(d3.stackOffsetSilhouette)
    .keys(["Health"])(data);
  const stackSleep = d3
    .stack()
    .offset(d3.stackOffsetSilhouette)
    .keys(["Sleep"])(data);
  const stackExercise = d3
    .stack()
    .offset(d3.stackOffsetSilhouette)
    .keys(["Exercise"])(data);

  // Compute the y-domain based on stack data
  const healthDomain = [
    d3.min(stackHealth, (layer) => d3.min(layer, (d) => d[0])),
    d3.max(stackHealth, (layer) => d3.max(layer, (d) => d[1])),
  ];

  const sleepDomain = [
    d3.min(stackSleep, (layer) => d3.min(layer, (d) => d[0])),
    d3.max(stackSleep, (layer) => d3.max(layer, (d) => d[1])),
  ];

  const exerciseDomain = [
    d3.min(stackExercise, (layer) => d3.min(layer, (d) => d[0])),
    d3.max(stackExercise, (layer) => d3.max(layer, (d) => d[1])),
  ];

  // Define separate Y scales for each section, based on the stack domain
  const yHealth = d3
    .scaleLinear()
    .domain(healthDomain)
    .range([height, height - sectionHeight]);

  const ySleep = d3
    .scaleLinear()
    .domain(sleepDomain)
    .range([height - sectionHeight, height - 2 * sectionHeight]);

  const yExercise = d3
    .scaleLinear()
    .domain(exerciseDomain)
    .range([height - 2 * sectionHeight, 0]);

  // Define color palette
  /// Original - const color = d3.scaleOrdinal().domain(keys).range(["#FF8C00", "#8390FA", "#FAC748"]); //First is Health, Second is Sleep, Third is Exercise 
  const color = d3.scaleOrdinal().domain(keys).range(["#003f5c", "#bc5090", "#ffa600"]); //First is Health, Second is Sleep, Third is Exercise 



  // Create area generator for each stacked data
  const areaHealth = d3
    .area()
    .x((d) => x(d.data.Days))
    .y0((d) => yHealth(d[0]))
    .y1((d) => yHealth(d[1]))
    .curve(d3.curveCardinal);

  const areaSleep = d3
    .area()
    .x((d) => x(d.data.Days))
    .y0((d) => ySleep(d[0]))
    .y1((d) => ySleep(d[1]))
    .curve(d3.curveCardinal);

  const areaExercise = d3
    .area()
    .x((d) => x(d.data.Days))
    .y0((d) => yExercise(d[0]))
    .y1((d) => yExercise(d[1]))
    .curve(d3.curveCardinal);

  // Function to handle mouseover event
  function handleMouseOver(section) {
    svg.selectAll("path").style("opacity", 0.4); // Fade out all sections
    svg.selectAll(`.${section}`).style("opacity", 1); // Highlight the hovered section
  }

  // Function to find the nearest data point based on mouse position
  function getNearestData(mouseX, data) {
    const mouseDate = x.invert(mouseX); // Convert mouse position to corresponding Days value
    const index = d3.bisector((d) => d.Days).left(data, mouseDate); // Find the closest index
    return data[index] || data[data.length - 1]; // Return the closest data point
  }

  // Function to handle mouse move (seamless update)
  function handleMouseMove(name, event) {
    const [mouseX] = d3.pointer(event); // Use d3.pointer for better positioning

    // Find the nearest data point
    const nearestData = getNearestData(mouseX, data);

    // Update the tooltip content with the nearest data's value
    const content = `
    <strong>${name}</strong><br>
    Day: ${nearestData.Days}<br>
    Value: ${nearestData[name].toFixed(3)}<br>
  `;

    // Update tooltip position and content
    tooltip
      .html(content)
      .style("visibility", "visible")
      .style("top", `${event.pageY + 25}px`) // Slightly offset Y position for better visibility
      .style("left", `${event.pageX + 25}px`) // Offset X position to avoid overlap with mouse
      .style("opacity", 1);  // Show the tooltip smoothly

    // Update the vertical line position
    verticalLine
      .attr("x1", x(nearestData.Days))
      .attr("x2", x(nearestData.Days))
      .attr("y1", 0)
      .attr("y2", height) // Span the entire height of the chart
      .style("opacity", 1); // Show the line
}

  // Function to handle mouse leave
  function handleMouseLeave() {
    svg.selectAll("path").style("opacity", 1); // Reset all to full opacity
    tooltip.style("visibility", "hidden");

  // Hide the vertical line
  verticalLine.style("opacity", 0);

  }

  // Plot stacked areas for Health
  svg
    .selectAll(".myHealth")
    .data(stackHealth)
    .join("path")
    .attr("class", "myHealth")
    .style("fill", color("Health"))
    .attr("d", areaHealth)
    .on("mouseover", () => {
      handleMouseOver("myHealth");
    })
    .on("mousemove", (event) => {
      handleMouseMove("Health", event);
    })
    .on("mouseleave", handleMouseLeave);

  // Plot stacked areas for Sleep
  svg
    .selectAll(".mySleep")
    .data(stackSleep)
    .join("path")
    .attr("class", "mySleep")
    .style("fill", color("Sleep"))
    .attr("d", areaSleep)
    .on("mouseover", () => {
      handleMouseOver("mySleep");
    })
    .on("mousemove", (event) => {
      handleMouseMove("Sleep", event);
    })
    .on("mouseleave", handleMouseLeave);

  // Plot stacked areas for Exercise
  svg
    .selectAll(".myExercise")
    .data(stackExercise)
    .join("path")
    .attr("class", "myExercise")
    .style("fill", color("Exercise"))
    .attr("d", areaExercise)
    .on("mouseover", () => handleMouseOver("myExercise"))
    .on("mousemove", (event) => {
      handleMouseMove("Exercise", event);
    })
    .on("mouseleave", handleMouseLeave);

  // Re-append the vertical line to bring it to the front
  svg.node().appendChild(verticalLine.node());

});
