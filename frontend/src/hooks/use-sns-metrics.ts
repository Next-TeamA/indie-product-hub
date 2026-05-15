import useSWR from "swr";
import {
  getSnsMetrics,
  syncSnsMetrics,
  getXTweets,
  getXProfile,
  getThreadsPosts,
  getThreadsProfile,
  getThreadsMentions,
  type SnsMetricSnapshot,
  type XTweetMetrics,
  type XProfileMetrics,
  type ThreadsPostMetrics,
  type ThreadsProfileInsights,
  type ThreadsMention,
} from "@/lib/api/sns-metrics";

export function useSnsMetrics(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<SnsMetricSnapshot[]>(
    `projects/${projectId}/sns/metrics`,
    () => getSnsMetrics(projectId),
    { revalidateOnFocus: false }
  );
  return {
    metrics: data ?? [],
    error,
    isLoading,
    mutate,
    sync: async () => { await syncSnsMetrics(projectId); mutate(); },
  };
}

export function useXTweets(projectId: string) {
  const { data, error, isLoading } = useSWR<XTweetMetrics[]>(
    `projects/${projectId}/sns/x/tweets`,
    () => getXTweets(projectId),
    { revalidateOnFocus: false }
  );
  return { tweets: data ?? [], error, isLoading };
}

export function useXProfile(projectId: string) {
  const { data, error, isLoading } = useSWR<XProfileMetrics>(
    `projects/${projectId}/sns/x/profile`,
    () => getXProfile(projectId),
    { revalidateOnFocus: false }
  );
  return { profile: data, error, isLoading };
}

export function useThreadsPosts(projectId: string) {
  const { data, error, isLoading } = useSWR<ThreadsPostMetrics[]>(
    `projects/${projectId}/sns/threads/posts`,
    () => getThreadsPosts(projectId),
    { revalidateOnFocus: false }
  );
  return { posts: data ?? [], error, isLoading };
}

export function useThreadsProfile(projectId: string) {
  const { data, error, isLoading } = useSWR<ThreadsProfileInsights>(
    `projects/${projectId}/sns/threads/profile`,
    () => getThreadsProfile(projectId),
    { revalidateOnFocus: false }
  );
  return { profile: data, error, isLoading };
}

export function useThreadsMentions(projectId: string) {
  const { data, error, isLoading } = useSWR<{ mentions: ThreadsMention[]; count: number }>(
    `projects/${projectId}/sns/threads/mentions`,
    () => getThreadsMentions(projectId),
    { revalidateOnFocus: false }
  );
  return { mentions: data?.mentions ?? [], count: data?.count ?? 0, error, isLoading };
}
