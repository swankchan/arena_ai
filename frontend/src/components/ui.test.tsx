import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Sidebar } from "./Sidebar";
import { SystemStatus } from "./ui";

describe("SystemStatus", () => {
  it("shows separate backend and API indicators in the online state", () => {
    const html = renderToStaticMarkup(<SystemStatus online />);
    expect(html).toContain("Backend online · API connected");
    expect(html.match(/class="status-dot online"/g)).toHaveLength(2);
    expect(html).toContain('role="status"');
  });

  it("keeps both offline indicators explicit", () => {
    const html = renderToStaticMarkup(<SystemStatus online={false} />);
    expect(html).toContain("Backend offline · API unavailable");
    expect(html.match(/class="status-dot"/g)).toHaveLength(2);
    expect(html).not.toContain("status-dot online");
  });

  it("omits the sidebar footer", () => {
    const props: ComponentProps<typeof Sidebar> = {
      open: false,
      onClose: () => {},
      collections: [],
      collection: "",
      onSelectCollection: () => {},
      onCreateCollection: async () => {},
      onRenameCollection: async () => {},
      onDeleteCollection: async () => {},
      conversations: [],
      conversationId: null,
      onSelectConversation: () => {},
      onNewConversation: async () => {},
      onDeleteConversation: async () => {},
      queryOptions: { query_transformation: false, query_expansion: false },
      onQueryOptions: () => {},
      config: null,
    };
    const html = renderToStaticMarkup(<Sidebar {...props} />);
    expect(html).not.toContain("sidebar-footer");
    expect(html).not.toContain("Local first");
    expect(html).not.toContain("API connected");
    expect(html).not.toContain("API unavailable");
  });
});
