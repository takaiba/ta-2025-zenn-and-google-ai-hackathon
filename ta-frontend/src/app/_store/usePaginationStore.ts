import { create } from "zustand";

export type Store = {
  meetingsSelectedPage: number;
  setMeetingsSelectedPage: (pageNumber: number) => void;
};

/**
 * ページネーションの選択されているページ数の状態を管理する
 */
export const usePaginationStore = create<Store>((set, _get) => ({
  meetingsSelectedPage: 1,
  setMeetingsSelectedPage: (pageNumber: number) =>
    set({ meetingsSelectedPage: pageNumber }),
}));
