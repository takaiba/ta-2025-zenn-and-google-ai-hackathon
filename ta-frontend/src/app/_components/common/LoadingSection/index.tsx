import { Skeleton } from "../Skeleton";

export const LoadingSection = () => {
  return (
    <div className={"p-6 space-y-4"}>
      <div className={"space-y-3"}>
        <Skeleton className={"h-8 w-48"} />
        <Skeleton className={"h-4 w-96"} />
      </div>
      <div className={"space-y-2"}>
        <Skeleton className={"h-20 w-full"} />
        <Skeleton className={"h-20 w-full"} />
        <Skeleton className={"h-20 w-full"} />
      </div>
    </div>
  );
};