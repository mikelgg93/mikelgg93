import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
const ContactPage = () => {
  return (
    <div className="w-[90%]">
      <h1 className="ml-2">Contact</h1>
      <Textarea
        className="my-4 h-2.5"
        placeholder="This page is still WIP, you won't be able to use this contact form."
      />
      <Button
        disabled
        variant="outline"
        className="my-auto items-center justify-center"
      >
        Submit
      </Button>
    </div>
  );
};
export default ContactPage;
