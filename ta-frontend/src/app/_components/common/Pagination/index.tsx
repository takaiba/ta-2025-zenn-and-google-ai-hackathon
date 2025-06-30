"use client";

import { useWindowSize } from "@/app/_hooks/useWindowSIze";

import { ArrowLeftIcon } from "../../icon/ArrowLeftIcon";
import { ArrowRightIcon } from "../../icon/ArrowRightIcon";
import { ThreeDotsIcon } from "../../icon/ThreeDotsIcon";

export type Props = {
  limit: number;
  page: number;
  total: number;
  onChangePage?: (pageNumber: number) => void;
};

/**
 * ページネーション
 */
export const Pagination = (props: Props) => {
  const { isMobile } = useWindowSize();

  const maxPage = Math.ceil(props.total / props.limit);
  const isDisabledBackPageButton = props.page === 1;
  const isDisabledNextPageButton = props.page >= maxPage;

  const handleChangePage = (newPage: number) => {
    props.onChangePage?.(newPage);
  };

  const btnStyle = `flex items-center justify-center rounded-[4px] font-bold leading-none transition duration-100 ease-in-out px-[8px] py-[8px] text-[12px] tracking-wider ${
    isMobile ? "w-[30px]" : "w-[30px]"
  } ${isMobile ? "h-[30px]" : "h-[30px]"}`;
  const btnActiveStyle = `bg-bg-darkGrey text-bg-white hover:bg-bg-darkGrey`;
  const btnInactiveStyle = `bg-bg-white text-text-title border-text-description border disabled:bg-bg-lightGray hover:bg-bg-select/80 disabled:border-text-placeholder`;

  return (
    <div className={`flex items-center justify-center gap-[8px]`}>
      {!isDisabledBackPageButton && (
        <button
          onClick={() => props.page > 1 && handleChangePage(props.page - 1)}
          type={"button"}
          className={`${btnStyle} ${btnInactiveStyle}`}
          disabled={isDisabledBackPageButton}
        >
          <ArrowLeftIcon size={isMobile ? 12 : 20} color={"black"} />
        </button>
      )}
      <div className={`flex items-center justify-center gap-[8px]`}>
        {props.page > 1 && (
          <button
            onClick={() => handleChangePage(1)}
            type={"button"}
            className={`${btnStyle} ${btnInactiveStyle}`}
          >
            1
          </button>
        )}
        {props.page > 3 && <ThreeDotsIcon />}
        {props.page > 2 && (
          <button
            onClick={() => handleChangePage(props.page - 1)}
            type={"button"}
            className={`${btnStyle} ${btnInactiveStyle}`}
          >
            {props.page - 1}
          </button>
        )}
        <button
          type={"button"}
          className={`${btnStyle} ${btnActiveStyle}`}
          disabled
        >
          {props.page}
        </button>
        {props.page < maxPage - 1 && (
          <button
            onClick={() => handleChangePage(props.page + 1)}
            type={"button"}
            className={`${btnStyle} ${btnInactiveStyle}`}
          >
            {props.page + 1}
          </button>
        )}
        {props.page < maxPage - 2 && <ThreeDotsIcon />}
        {props.page < maxPage && (
          <button
            onClick={() => handleChangePage(maxPage)}
            type={"button"}
            className={`${btnStyle} ${btnInactiveStyle}`}
          >
            {maxPage}
          </button>
        )}
      </div>
      {!isDisabledNextPageButton && (
        <button
          onClick={() =>
            props.page < maxPage && handleChangePage(props.page + 1)
          }
          type={"button"}
          className={`${btnStyle} ${btnInactiveStyle}`}
          disabled={isDisabledNextPageButton}
        >
          <ArrowRightIcon size={isMobile ? 12 : 20} color={"black"} />
        </button>
      )}
    </div>
  );
};
