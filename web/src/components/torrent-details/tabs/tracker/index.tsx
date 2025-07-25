"use client";

import { TorrentInfo } from "@/types/socket/torrent_info";
import { TrackerTabDataTable } from "./data-table";
import { columns } from "./columns";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useEffect, useRef, useState } from "react";
import { useSocketConnection } from "@/hooks/use-socket";
import { useIntersectionObserver } from "@/hooks/use-intersection-observer";
import TrackerTabLoading from "./loading";

export default function TrackersTab({ infoHash }: { infoHash: string }) {
    const [torrentData, setTorrentData] = useState<TorrentInfo | null>(null);
    const { ref, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
        threshold: 0.5,
    });
    const [loading, setLoading] = useState<boolean>(false);
    const hasLoadedOnce = useRef(false);

    const socket = useSocketConnection();

    useEffect(() => {
        if (!isIntersecting) return;
        let mounted = true;

        async function fetchAndUpdateLoop() {
            while (mounted) {
                if (!hasLoadedOnce.current) {
                    setLoading(true);
                }

                await new Promise<void>((resolve) => {
                    socket.current?.emit(
                        "libtorrent:get_specific",
                        { info_hash: infoHash },
                        (response: {
                            status: string;
                            torrent: TorrentInfo;
                        }) => {
                            if (!mounted) return resolve();
                            if (response.status === "success") {
                                setTorrentData(response.torrent);
                            } else {
                                console.error(
                                    "Failed to fetch torrent data:",
                                    response,
                                );
                            }
                            resolve();
                        },
                    );
                });

                if (!hasLoadedOnce.current) {
                    setLoading(false);
                    hasLoadedOnce.current = true;
                }

                await new Promise((res) => setTimeout(res, 1000));
            }
        }

        fetchAndUpdateLoop();
        return () => {
            mounted = false;
        };
    }, [isIntersecting, socket, infoHash]);

    return (
        <div ref={ref} className="flex h-94 w-full flex-1 flex-col">
            {loading ? (
                <TrackerTabLoading />
            ) : (
                <ScrollArea className="w-full flex-1 overflow-x-auto pb-4">
                    <div>
                        <TrackerTabDataTable
                            infoHash={infoHash}
                            columns={columns}
                            data={torrentData?.trackers || []}
                        />
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            )}
        </div>
    );
}
