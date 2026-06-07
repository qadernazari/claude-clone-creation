import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { fetchBrowsePageData } from "./browse.server";
import type { BrowsePageData } from "./browse.types";

export const getBrowsePageData = createServerFn({ method: "GET" }).handler(
  async (): Promise<BrowsePageData> => fetchBrowsePageData(),
);

export const browsePageQueryOptions = queryOptions({
  queryKey: ["browse", "page-data"],
  queryFn: () => getBrowsePageData(),
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
});
