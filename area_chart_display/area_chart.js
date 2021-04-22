'use strict';
(function() {

    let removeEventListener;
    let filteredColumns = [];

    $(document).ready(function() {
        tableau.extensions.initializeAsync().then(function() {
            const savedSheetName = "D3 DATA (2)"
            const search_data_sheet = "Impressions vs CTR " 
            loadSelectedMarks(savedSheetName, search_data_sheet);

        }, function(err) {
            // Something went wrong in initialization.
            console.log('Error while Initializing: ' + err.toString());
        });
    });


    function loadSelectedMarks(worksheetName, search_data) {
        if (removeEventListener) {
            removeEventListener();
        }

        const worksheet = demoHelpers.getSelectedSheet(worksheetName);
        const worksheet_2 = demoHelpers.getSelectedSheet(search_data);

        console.log(worksheet_2)

        const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;
        for (let i = 0; i < worksheets.length; i++) {
            console.log(worksheets[i].name)
        }
         
        var unique_partners = [];
        worksheet_2.getSummaryDataAsync().then(function(sumdata) {
           const worksheetData = sumdata.data;
           for ( let i=0; i < worksheetData.length;i++){
               let partner_name = worksheetData[i][0].value
               if (unique_partners.includes(partner_name)){
                   return null
               } else {
                   unique_partners.push(partner_name)
               }
           }
          return null 
       });
        console.log('search array', unique_partners)

        worksheet.getSummaryDataAsync().then(function(sumdata) {
            const worksheetData = sumdata;
            var cols = [];

            console.log(worksheetData)

            // create an array of data columns to gather fieldnames
            worksheetData.columns.map(d => {
                cols.push(d.fieldName);
            })
            
            let newArr = [];
            let dataJson;
            let partnerList = {}
            worksheetData.data.map(d => {
                dataJson = {};
                     for (let i=0; i < cols.length; i++){
                       if (cols[i].includes("AGG(4. VCR)")){
                         dataJson[cols[i]] = !isNaN(d[i].value) ? d[i].value : 0;
                       } else {
                       dataJson[cols[i]] = d[i].value;
                       }
                     }

                newArr.push(dataJson)     
                   if (dataJson['Partner'] in partnerList) {
                       return 'none'
                   }   else {
                       partnerList[dataJson['Partner']] = 0
                   }

             });

             let partners = [];
             for (const [key, value] of Object.entries(partnerList))
                 partners.push(key)
  
              let filtered_partners = [];
                 for ( let i=0; i < unique_partners.length;i++){
                  if (partners.includes(unique_partners[i])){
                      filtered_partners.push(unique_partners[i])
                  } else {
                      console.log('no match')
                  }
              }
 

             let sums = {};
             let i;
             for (i = 0; i < newArr.length; i++) {

                 var partner = newArr[i]["Partner"]
                 var impressions = newArr[i]["SUM(Impressions)"]
                 var ctr = newArr[i]["AGG(3. CTR)"]
                 var date = newArr[i]["Week Commencing"]
                 var video_type = newArr[i]["Video Type"]
                 var client = newArr[i]["Client "]
                 var ctr_perf = newArr[i]["AGG(3. CTR Performance)"]
                 var campaign = newArr[i]["Campaign"]


                var client_date = client + '_' + date

                if (client_date in sums) {
                    sums[client_date]['impressions'] += impressions
                    sums[client_date]['ctr'] += ctr



                } else {
                    sums[client_date] = {
                        "ctr_perf": ctr_perf,
                        "campaign": campaign,
                        "impressions": impressions,
                        "ctr": ctr,
                        "client": client,
                        "partner": partner,
                        "date": date
                    }
                }
            }
            var sumsArr = []
            for (const [key, value] of Object.entries(sums))
                sumsArr.push(value)

            sumsArr.sort((a, b) => (a.date > b.date) ? 1 : -1)
            console.log(sumsArr)
            drawDotChart(sumsArr, filtered_partners);


        });

        worksheet.getSelectedMarksAsync().then((marks) => {
            demoHelpers.populateDataTable(marks, filterByColumn);
        });

        const marksSelectedEventHandler = (event) => {
            loadSelectedMarks(worksheetName);
        }
        // removeEventListener = worksheet.addEventListener(
        //     tableau.TableauEventType.MarkSelectionChanged, marksSelectedEventHandler);

        removeEventListener = worksheet.addEventListener(
            tableau.TableauEventType.FilterChanged, marksSelectedEventHandler);
    }

    function saveSheetAndLoadSelectedMarks(worksheetName) {
        tableau.extensions.settings.set('sheet', worksheetName);
        tableau.extensions.settings.saveAsync();
        loadSelectedMarks(worksheetName);
        console.log('hi')

    }

    function filterByColumn(columnIndex, fieldName) {
        const columnValues = demoHelpers.getValuesInColumn(columnIndex);
        const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;
        const worksheet = demoHelpers.getSelectedSheet(tableau.extensions.settings.get('sheet'));
        // console.log(worksheets)
        // console.log(worksheet)

        worksheets[0].applyFilterAsync(fieldName, columnValues, tableau.FilterUpdateType.Replace);

        filteredColumns.push(fieldName);
    }

    function resetFilters() {
        const worksheet = demoHelpers.getSelectedSheet(tableau.extensions.settings.get('sheet'));
        filteredColumns.forEach((columnName) => {
            worksheet.clearFilterAsync(columnName);
        });

        filteredColumns = [];
    }


    function drawDotChart(arr, partnersArr) {
        $('#wrapper').empty();
        const dateParser = d3.utcParse("%Y-%m-%d")
        const formatDate = d3.timeFormat("%b %-d, %Y")
        // const formatDate = d3.timeFormat("%b %d")
        const formatDate2 = d3.timeFormat("%b %d")
        const xAccessor = d => Date.parse(dateParser(d.date))
        const yAccessor = d => d.impressions
        const y2Accessor = d => d.ctr
        const clicks = d => d.clicks
        const add_commas = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        const client = d => d.client

        var area_chart_elem = []
        // for (let j=0; j < partnersArr.length ; j++){
        //     area_chart_elem.push([])
        // }
        // console.log('area_chart_elem',area_chart_elem)

       for ( let i=0; i < arr.length ; i++){
           for (let j=0; j < partnersArr.length ; j++){
                if (arr[i].partner == partnersArr[j] ){
                    area_chart_elem.push(arr[i])
                 
                }
            }
       }

       var average_y2 = d3.mean(area_chart_elem, y2Accessor).toFixed(2);


       console.log(area_chart_elem)


        const width = d3.min([
            window.innerWidth * 0.95,
        ])
        const height = d3.min([
            window.innerHeight * 0.85,
        ])


        let dimensions = {
            width: width,
            height: height,
            margin: {
                top: 10,
                right: 50,
                bottom: 30,
                left: 50,
            },
        }
        dimensions.boundedWidth = dimensions.width -
            dimensions.margin.right -
            dimensions.margin.left
        dimensions.boundedHeight = dimensions.height -
            dimensions.margin.top -
            dimensions.margin.bottom

        const wrapper = d3.select("#wrapper")
            .append("svg")
            .attr("width", dimensions.width)
            .attr("height", dimensions.height)

        const bounds = wrapper.append("g")
            .style("transform", `translate(${
           dimensions.margin.left
         }px,${
           dimensions.margin.top
         }px)`)



        const div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        const xScale = d3.scaleUtc()
            .domain(d3.extent(area_chart_elem, xAccessor))
            .range([0, dimensions.boundedWidth])


        const yScale = d3.scaleLinear()
            .domain(d3.extent(area_chart_elem, yAccessor))
            .range([dimensions.boundedHeight, 0])
            .nice()

        const y2Scale = d3.scaleLinear()
            .domain(d3.extent(area_chart_elem, y2Accessor))
            .range([dimensions.boundedHeight, 0])
            // .nice()

        const b_sizze = d3.scaleLinear()
            .domain(d3.extent(area_chart_elem, clicks))
            .range([2, 8])



        function x_gridlines() {
            return d3.axisBottom(xScale)
                .ticks(0)
        }

        function y_gridlines() {
            return d3.axisLeft(yScale)
                .ticks(5)
        }

        function y2_gridlines() {
            return d3.axisRight(y2Scale)
                .ticks(0)
        }



        bounds.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(0," + dimensions.boundedHeight + ")")
            .call(x_gridlines()
                .tickSize(-dimensions.boundedHeight)
                .tickFormat("")
            )

        bounds.append("g")
            .attr("class", "grid")
            .call(y_gridlines()
                .tickSize(-dimensions.boundedWidth)
                .tickFormat("")
            )

        bounds.append("g")
            .attr("class", "grid_y2")
            // .attr("stroke-dasharray", "4px 4px")
            .call(y2_gridlines()
                .tickSize(dimensions.boundedWidth)
                .tickFormat("")
            )

        var clip = bounds.append("defs").append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("width", dimensions.boundedWidth)
            .attr("height", dimensions.boundedHeight)
            .attr("stroke","none")
            .attr("x", 0)
            .attr("y", 0);

        const curve = d3.curveLinear

        var area = bounds.append("g")
            .attr("class","areas")
            .attr("clip-path", "url(#clip)")

        var colorId = area.append("color");
        var conditions = ["Below", "Exceed"];
        var colors = ["#e15759","#8ab562"];


        // for (let i=0; i<arr.length; i++){
        //   console.log(arr[i].ctr, arr[i].ctr<4)
        // }

        const color = d3.scaleOrdinal(
            area_chart_elem.conditions === undefined ? area_chart_elem.map(d => d.ctr_perf) : area_chart_elem.conditions,
            area_chart_elem.colors === undefined ? d3.schemeCategory10 : area_chart_elem.colors
        ).unknown("#1B2326")

        area.append("linearGradient")
        .attr("id", "colorId")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", 0)
        .attr("x2", dimensions.boundedWidth)
        .selectAll("stop")
        .data(area_chart_elem)
        .enter()
        .append("stop")
        .attr("offset", d => xScale(Date.parse(dateParser(d.date))) / dimensions.boundedWidth)
        // .attr("stop-color", d => color(d.ctr_perf));
        .attr("stop-color", d => d.ctr < average_y2 ? colors[0] : colors[1]);




        function mouseOn(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0.95)
            d3.select(this)
                .style("opacity", 1)
            div.html("Impressions: " + d.impressions + "<br/>" + "CTR: " + (d.ctr*10).toFixed(1) + "%")
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        };

        function mouseOut(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0);
            d3.select(this)
                .style("opacity", 0.6)
        };

        function mouseOnLine(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0.95)
            d3.select(this)
                .style("opacity", 0.3)
            div.html("Client: " + d.client + "<br/>" + "Impressions: " + add_commas(d.impressions) + "</br>" + "CTR: " + Math.round(d.ctr) + "%" + "</br>" + "Date: " + d.date)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        };

        function mouseOutLine(d) {
            div.transition()
                .duration(200)
                .style("opacity", 0);
            d3.select(this)
            .style("opacity", 0);
        };



        var brush = d3.brushX()
            .extent([
                [0, 0],
                [dimensions.boundedWidth, dimensions.boundedHeight]
            ])
            .on("end", updateChart)



        const path1 = d3.area()
            .x(d => xScale(xAccessor(d)))
            .y0(yScale(0))
            .y1(d => yScale(yAccessor(d)))
            .curve(curve)


        area.append("path")
            .datum(area_chart_elem)
            .transition()
            .duration(300)
            .attr("opacity",0)
            .attr("id", "area1")
            .attr("class", "area1")
            .transition()
            .duration(900)
            .attr("fill", "#7e9096")
            .attr("opacity", .5)
            .attr("d", path1)


        area
            .append("g")
            .attr("class", "brush")
            .call(brush);

            area.selectAll("line")
               .data(area_chart_elem)
               .enter()
               .append("line")
               .attr("stroke","#1b2326")
               .style("opacity",0)
               .attr("stroke-width","2px")
               .attr("x1", d => xScale(xAccessor(d)))
               .attr("y1", d => yScale(yAccessor(d)))
               .attr("x2",d => xScale(xAccessor(d)))
               .attr("y2",dimensions.boundedHeight);

            area.selectAll("line")
                .on("mouseover", mouseOnLine)
                .on("mouseout", mouseOutLine);




        //
        // area.selectAll("line")
        //    .data(arr)
        //    .enter()
        //    .append("line")
        //    .attr("stroke","#1b2326")
        //    .style("opacity",0)
        //    .attr("x1", d => xScale(xAccessor(d)))
        //    .attr("y1", d => yScale(yAccessor(d)))
        //    .attr("x2",d => xScale(xAccessor(d)))
        //    .attr("y2",dimensions.boundedHeight);
        //
        // area.selectAll("line")
        //     .on("mouseover", mouseOnLine)
        //     .on("mouseout", mouseOutLine);






        const curve2 = d3.curveLinear


        const line1 = d3.line()
            .x(d => xScale(xAccessor(d)))
            .y(d => y2Scale(y2Accessor(d)))
            .curve(curve2)


        area.append("path")
            .data(area_chart_elem)
            .attr("class", "ctrLine")
            .attr("fill", 'none')
            .attr("stroke-width","2px")
            .attr("stroke", "url(#colorId)")
            .attr("d", line1(area_chart_elem))
        //
        //
        // area.selectAll("circle")
        //    .data(arr)
        //    .enter()
        //    .append("circle")
        //    .attr("class", "endPoints")
        //    .attr("fill", "#1B2326")
        //    .style("opacity", 0.6)
        //    .attr("stroke", "none")
        //    .attr("cx", d => xScale(xAccessor(d)))
        //    .attr("cy", d => y2Scale(y2Accessor(d)))
        //    .attr("r", d => b_sizze(clicks(d)))
        //
        // area.selectAll("circle")
        //     .on("mouseover", mouseOn)
        //     .on("mouseout", mouseOut);

        // area.selectAll("path")
        //     .on("mouseover", highlight)
        //     .on("mouseout", noHighlight);

            function highlight(d) {
                    d3.select('.areas')
                    .transition()
                    .duration(500)
                    .style("opacity", 0)
                    d3.select(this).style("opacity", 1)
            };

            function noHighlight(d) {
                d3.select('.areas')
                .transition()
                .duration(500)
                .style("opacity", 1)
            };


        const avgLine_y = bounds.append("line")
            .attr("y1", d => y2Scale(average_y2))
            .attr("y2", d => y2Scale(average_y2))
            .attr("x1", 0)
            .attr("x2", dimensions.boundedWidth)
            .attr("stroke", "#1B2326")
            .attr("stroke-width", "1px")
            .attr("weight", 3)
            .attr("stroke-dasharray", "5px 5px")

        const avgLabel_y = bounds.append("text")
            .attr("y", d => y2Scale(average_y2) - 5)
            .attr("x", 10)
            .style("font-weight", "bold")
            .text("Avg CTR:")
            .attr("fill", "#1B2326")
            .style("font-size", "10px")
            .attr("font-family", "Arial")

        // var roundNo_2 = d3.format(10 + "%");

        const avgLabel_y_2 = bounds
            .append("g")
        avgLabel_y_2
            .selectAll("text")
            .data(area_chart_elem)
            .enter()
            .append("text")
            .text(d => Math.round(average_y2) + "%")
            .attr("y", d => y2Scale(average_y2) + 15)
            .attr("x", 10)
            .style("font-size", "10px")
            .attr("font-family", "Arial")
            .attr("fill", "#1B2326")


        var idleTimeout

        function idled() {
            idleTimeout = null;
        }

        function updateChart() {

            // What are the selected boundaries?
            var extent = d3.event.selection

            // If no selection, back to initial coordinate. Otherwise, update X axis domain
            if (!extent) {
                if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
                xScale.domain([4, 8])
            } else {
                xScale.domain([xScale.invert(extent[0]), xScale.invert(extent[1])])
                area.select(".brush").call(brush.move, null) // This remove the grey brush area as soon as the selection has been done
            }

            // Update axis and area position
            xAxis.transition().duration(1000).call(
              d3.axisBottom(xScale)
              .ticks(5)
              .tickFormat(formatDate2))


            area
                .select('.area1')
                .transition()
                .duration(1000)
                .attr("d", path1)

            area
                .select('.ctrLine')
                .transition()
                .duration(1000)
                .attr("d", line1(area_chart_elem))


        }

        bounds.on("dblclick", function() {
            xScale.domain(d3.extent(area_chart_elem, xAccessor))
            xAxis.transition().call(d3.axisBottom(xScale)
            .ticks(5)
            .tickFormat(formatDate))
            area
                .select('.area1')
                .transition()
                .attr("d", path1)

            area
                .select('.ctrLine')
                .transition()
                .attr("d", line1(area_chart_elem))


        });

        const remove_zero = d => (d / 1e6) + "M";

        const yAxisGenerator = d3.axisLeft()
            .scale(yScale)
            .ticks(5)
            .tickFormat(remove_zero);

        const yAxis = bounds.append("g")
            .attr("class","axisLine")
            .call(yAxisGenerator)
            .attr("font-family", "Arial")
            .attr("font-size", "8")
            .attr("text-align", "left")



        const y2AxisGenerator = d3.axisRight()
            .scale(y2Scale)
            .ticks(5)
            .tickFormat(d => d + "%");

        const y2Axis = bounds.append("g")
            .attr("class","axisLine")
            .call(y2AxisGenerator)
            .style("transform", `translateX(${
              dimensions.boundedWidth
            }px)`)
            .attr("font-family", "Arial")
            .attr("font-size", "8")
            .attr("text-align", "left")



        const xAxisGenerator = d3.axisBottom()
            .scale(xScale)
            .ticks(5)
            .tickFormat(formatDate);


        const xAxis = bounds.append("g")
            .attr("class","axisLine")
            .call(xAxisGenerator)
            .style("transform", `translateY(${
        dimensions.boundedHeight
      }px)`)
            .attr("font-family", "Arial")
            .attr("font-size", "8")

        const xAxisLabel = xAxis.append("text")
            .attr("x", dimensions.boundedWidth / 2)
            .attr("y", dimensions.margin.bottom)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("")
            .attr("fill", "#1B2326")

        const yAxisLabel = yAxis.append("text")
            .attr("x", -dimensions.boundedHeight / 2)
            .attr("y", -dimensions.margin.left + 10)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("Impressions")
            .style("transform", "rotate(-90deg)")
            .style("text-anchor", "middle")
            .style("fill", "#1B2326")

        const y2AxisLabel = y2Axis.append("text")
            .attr("x", dimensions.boundedHeight / 2)
            .attr("y", -dimensions.margin.right + 10)
            .style("font-family", "Arial")
            .style("font-size", "10")
            .style("font-weight", "bold")
            .html("CTR")
            .style("transform", "rotate(90deg)")
            .style("text-anchor", "middle")
            .attr("fill", "#1B2326")

    }

})();
