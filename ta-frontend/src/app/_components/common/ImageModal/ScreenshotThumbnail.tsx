"use client";

import React, { FC, useState } from "react";

import { createImageDataUrl, isValidImageData, inferMimeType } from "@/utils/imageUtils";

import { ImageModal } from "./ImageModal";

type Props = {
  src: string;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export const ScreenshotThumbnail: FC<Props> = ({ 
  src, 
  alt, 
  size = "sm", 
  className = "" 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sizeClasses = {
    sm: "w-12 h-8",
    md: "w-16 h-12", 
    lg: "w-20 h-16"
  };

  // Base64データを正しいData URL形式に変換
  const imageSrc = isValidImageData(src) 
    ? createImageDataUrl(src, inferMimeType(src))
    : src;

  // 有効な画像データがない場合は何も表示しない
  if (!isValidImageData(src)) {
    return null;
  }

  return (
    <>
      <div
        className={`${sizeClasses[size]} cursor-pointer rounded border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors ${className}`}
        onClick={() => setIsModalOpen(true)}
      >
        <img
          src={imageSrc}
          alt={alt}
          className={"w-full h-full object-cover"}
          onError={(e) => {
            // 画像読み込みエラー時の処理
            console.warn("Failed to load image:", src);
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
      <ImageModal
        src={imageSrc}
        alt={alt}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
};