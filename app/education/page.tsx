import Resume from "@/components/data/RESUME.json";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader } from "@/components/ui/card";

const EducationPage = () => {
  const education = Resume.education;

  return (
    <div className="w-[90%]">
      {education.map((item, index) => (
        <Card key={index} className="mb-5">
          <CardHeader>
            <div className="flex flex-row space-x-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={item.logo} />
                <AvatarFallback>{item.institution}</AvatarFallback>
              </Avatar>
              <div className="">
                <h4 className="mt-0 text-sm font-semibold">{item.studyType}</h4>
                <p className="text-xs">{item.institution}</p>
              </div>
              <div className="text-xs right-0">{item.level}</div>
            </div>
          </CardHeader>
          <p className="text-xs ml-5 mb-4">
            Started: {item.startDate} - Ended: {item.endDate}
          </p>
        </Card>
      ))}
    </div>
  );
};

export default EducationPage;
