import { For, Show } from "solid-js";
import type { AlbumInfo, AlbumPageData, ArtistPageData } from "../lib/netease";
import type { Track } from "../data/mock";
import { CoverArt } from "../components/CoverArt";
import { Icon } from "../components/Icon";

export type ArtistEntry = {
  kind: "artist";
  key: number;
  id: string;
  loading: boolean;
  data: ArtistPageData | null;
  error?: string;
};

export type AlbumEntry = {
  kind: "album";
  key: number;
  id: string;
  loading: boolean;
  data: AlbumPageData | null;
  error?: string;
};

export type EntityEntry = ArtistEntry | AlbumEntry;

type EntityProps = {
  entry: EntityEntry;
  current: Track;
  playing: boolean;
  onBack: () => void;
  onPlayTrack: (track: Track, context?: Track[]) => void;
  onPlayAll: (tracks: Track[]) => void;
  onOpenArtist: (id: string) => void;
  onOpenAlbum: (id: string) => void;
};

function yearOf(time: number): string {
  if (!time) return "未知年份";
  return String(new Date(time).getFullYear());
}

function EntityShell(props: {
  entry: EntityEntry;
  onBack: () => void;
  cover: string;
  palette: [string, string, string, string];
  children: unknown;
}) {
  return (
    <div class="page entity-page">
      <div class="detail-source__backdrop" aria-hidden="true">
        <CoverArt palette={props.palette} url={props.cover} showLabel={false} />
        <div class="detail-source__shade" />
      </div>
      <div class="detail-source__top">
        <button class="detail-circle" onClick={props.onBack} aria-label="返回">
          <Icon name="chevron-left" size={24} />
        </button>
        <div class="detail-source__top-space" />
      </div>
      <Show
        when={!props.entry.loading && props.entry.data}
        fallback={
          <div class="entity-state">
            <Show
              when={!props.entry.error}
              fallback={<span>{props.entry.error ?? "加载失败"}</span>}
            >
              <span>正在加载…</span>
            </Show>
          </div>
        }
      >
        {props.children as never}
      </Show>
    </div>
  );
}

function EntityTrackList(props: {
  songs: Track[];
  current: Track;
  playing: boolean;
  onPlayTrack: (track: Track, context?: Track[]) => void;
  showAlbum?: boolean;
}) {
  if (props.songs.length === 0) {
    return <div class="entity-empty">暂无歌曲</div>;
  }
  return (
    <div class="entity-tracks">
      <For each={props.songs}>
        {(track, index) => (
          <button
            class="entity-track"
            classList={{ "is-active": track.id === props.current.id }}
            onClick={() => props.onPlayTrack(track, props.songs)}
          >
            <span class="entity-track__index num">{String(index() + 1).padStart(2, "0")}</span>
            <span class="entity-track__cover">
              <CoverArt
                palette={track.palette}
                seed={track.coverSeed ?? 0}
                url={track.coverUrl}
                showLabel={false}
              />
            </span>
            <span class="entity-track__main">
              <b>{track.title}</b>
              <small>{track.artist}</small>
            </span>
            <Show when={props.showAlbum !== false}>
              <span class="entity-track__album">{track.album}</span>
            </Show>
            <span class="entity-track__time num">{track.duration}</span>
            <span class="entity-track__play">
              <Icon
                name={track.id === props.current.id && props.playing ? "pause-fill" : "play-fill"}
                size={17}
              />
            </span>
          </button>
        )}
      </For>
    </div>
  );
}

function EntityAlbums(props: { albums: AlbumInfo[]; onOpenAlbum: (id: string) => void }) {
  return (
    <div class="entity-albums">
      <For each={props.albums}>
        {(album) => (
          <button class="entity-album" onClick={() => props.onOpenAlbum(album.id)}>
            <span class="entity-album__cover">
              <CoverArt
                palette={["#2a2626", "#7c4b43", "#c79b7b", "#181313"]}
                url={album.coverUrl}
                showLabel={false}
              />
            </span>
            <b>{album.name}</b>
            <small>
              {yearOf(album.publishTime)} · {album.size} 首
            </small>
          </button>
        )}
      </For>
    </div>
  );
}

function ArtistPage(props: EntityProps & { entry: ArtistEntry }) {
  const data = () => props.entry.data!;
  return (
    <EntityShell
      entry={props.entry}
      onBack={props.onBack}
      cover={data()?.artist.avatarUrl ?? ""}
      palette={["#2a2626", "#7c4b43", "#c79b7b", "#181313"]}
    >
      <header class="entity-hero entity-hero--artist">
        <span class="entity-avatar">
          <CoverArt
            palette={["#2a2626", "#7c4b43", "#c79b7b", "#181313"]}
            url={data()?.artist.avatarUrl}
            showLabel={false}
          />
        </span>
        <div class="entity-hero__meta">
          <span class="entity-kicker">歌手</span>
          <h1>{data()?.artist.name}</h1>
          <Show when={data()?.artist.aliases.length}>
            <p class="entity-sub">{data()?.artist.aliases.join(" / ")}</p>
          </Show>
          <p class="entity-stats">
            {data()?.artist.songCount ?? 0} 首歌曲 · {data()?.artist.albumCount ?? 0} 张专辑
          </p>
          <div class="entity-actions">
            <button
              class="entity-play"
              disabled={!data()?.songs.length}
              onClick={() => {
                const songs = data()?.songs ?? [];
                if (songs[0]) props.onPlayAll(songs);
              }}
            >
              <Icon name="play-fill" size={22} />
              播放热门歌曲
            </button>
          </div>
        </div>
      </header>

      <Show when={data()?.artist.briefDesc}>
        <p class="entity-bio">{data()?.artist.briefDesc}</p>
      </Show>

      <section class="entity-section">
        <div class="entity-section__head">
          <h2>热门歌曲</h2>
          <span>{data()?.songs.length ?? 0} 首</span>
        </div>
        <EntityTrackList
          songs={data()?.songs ?? []}
          current={props.current}
          playing={props.playing}
          onPlayTrack={props.onPlayTrack}
        />
      </section>

      <Show when={data()?.albums.length || data()?.albumError}>
        <section class="entity-section">
          <div class="entity-section__head">
            <h2>专辑</h2>
            <span>{data()?.albums.length ?? 0} 张</span>
          </div>
          <Show
            when={!data()?.albumError}
            fallback={<div class="entity-inline-error">专辑列表加载失败：{data()?.albumError}</div>}
          >
            <EntityAlbums albums={data()?.albums ?? []} onOpenAlbum={props.onOpenAlbum} />
          </Show>
        </section>
      </Show>
    </EntityShell>
  );
}

function AlbumPage(props: EntityProps & { entry: AlbumEntry }) {
  const data = () => props.entry.data!;
  return (
    <EntityShell
      entry={props.entry}
      onBack={props.onBack}
      cover={data()?.album.coverUrl ?? ""}
      palette={["#2a2626", "#7c4b43", "#c79b7b", "#181313"]}
    >
      <header class="entity-hero entity-hero--album">
        <span class="entity-album-cover">
          <CoverArt
            palette={["#2a2626", "#7c4b43", "#c79b7b", "#181313"]}
            url={data()?.album.coverUrl}
            showLabel={false}
          />
        </span>
        <div class="entity-hero__meta">
          <span class="entity-kicker">{data()?.album.kind || "专辑"}</span>
          <h1>{data()?.album.name}</h1>
          <p class="entity-album-artists">
            <For each={data()?.artists ?? []}>
              {(artist) => (
                <Show when={artist.id} fallback={<span>{artist.name}</span>}>
                  <button class="entity-link" onClick={() => props.onOpenArtist(artist.id)}>
                    {artist.name}
                  </button>
                </Show>
              )}
            </For>
          </p>
          <p class="entity-stats">
            {yearOf(data()?.album.publishTime ?? 0)} · {data()?.album.size ?? 0} 首
            <Show when={data()?.album.company}> · {data()?.album.company}</Show>
          </p>
          <div class="entity-actions">
            <button
              class="entity-play"
              disabled={!data()?.songs.length}
              onClick={() => {
                const songs = data()?.songs ?? [];
                if (songs[0]) props.onPlayAll(songs);
              }}
            >
              <Icon name="play-fill" size={22} />
              播放整张专辑
            </button>
          </div>
        </div>
      </header>

      <Show when={data()?.description}>
        <p class="entity-bio">{data()?.description}</p>
      </Show>

      <section class="entity-section">
        <div class="entity-section__head">
          <h2>曲目</h2>
          <span>{data()?.songs.length ?? 0} 首</span>
        </div>
        <EntityTrackList
          songs={data()?.songs ?? []}
          current={props.current}
          playing={props.playing}
          onPlayTrack={props.onPlayTrack}
          showAlbum={false}
        />
      </section>
    </EntityShell>
  );
}

export function EntityPage(props: EntityProps) {
  return (
    <Show
      when={props.entry.kind === "artist"}
      fallback={<AlbumPage {...props} entry={props.entry as AlbumEntry} />}
    >
      <ArtistPage {...props} entry={props.entry as ArtistEntry} />
    </Show>
  );
}
