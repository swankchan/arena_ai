import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Sidebar } from "./Sidebar";
import { SystemStatus } from "./ui";

describe("SystemStatus", () => {
  it("combines backend and API health in the online state", () => {
    const html = renderToStaticMarkup(<SystemStatus online />);
    expect(html).toContain("Backend online · API connected");
    expect(html).toContain("status-dot online");
    expect(html).toContain('role="status"');
  });

  it("keeps the combined offline state explicit", () => {
    const html = renderToStaticMarkup(<SystemStatus online={false} />);
    expect(html).toContain("Backend offline · API unavailable");
    expect(html).not.toContain("status-dot online");
  });

  it("leaves only the local-first label in the sidebar footer", () => {
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
    expect(html).toContain('<footer class="sidebar-footer">Local first</footer>');
    expect(html).not.toContain("API connected");
    expect(html).not.toContain("API unavailable");
  });
});
