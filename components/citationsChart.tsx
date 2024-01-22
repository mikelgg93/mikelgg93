import data from "@/components/data/citations.json";
import { ResponsiveLine } from "@nivo/line";

const Title = () => {
  return (
    <text y="-20" x="-20" className="text-base">
      Citations
    </text>
  );
};
const UnderLine = () => {
  return (
    <line
      x1="-20"
      y1="-10"
      x2="20"
      y2="-10"
      className="stroke-[4] stroke-lava"
    />
  );
};

const CitationsChart = () => {
  const theme = {
    fontFamily: "Noto Serif Display, serif",
    axis: {
      ticks: {
        text: {
          fontSize: 14,
          fontFamily: "Noto Serif Display, serif",
        },
      },
      // domain: {
      //   line: {
      //     stroke: "#777777",
      //     strokeWidth: 2,
      //   },
      // },
    },
  };
  const chartData = [
    {
      id: "citations",
      data: data.perYear.map((item) => ({
        x: item.year.toString(),
        y: parseInt(item.citations),
      })),
    },
  ];
  return (
    <ResponsiveLine
      data={chartData}
      theme={theme}
      layers={[
        "grid",
        "axes",
        "lines",
        "markers",
        "points",
        "mesh",
        "crosshair",
        Title,
        UnderLine,
      ]}
      margin={{ top: 50, right: 20, bottom: 50, left: 40 }}
      xScale={{ type: "point" }}
      yScale={{
        type: "linear",
        min: 0,
        max: "auto",
      }}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickSize: 5,
        tickPadding: 5,
      }}
      axisLeft={{
        tickSize: 5,
        tickPadding: 5,
      }}
      colors={["#A94438"]}
      enablePoints={false}
      enableGridX={false}
      pointSize={10}
      pointColor={{ theme: "background" }}
      pointBorderWidth={2}
      pointBorderColor={{ from: "serieColor" }}
      pointLabelYOffset={-12}
      useMesh={true}
    />
  );
};

export default CitationsChart;
