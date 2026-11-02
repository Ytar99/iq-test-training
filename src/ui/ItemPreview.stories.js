import { jsx as _jsx } from "react/jsx-runtime";
import { useArgs } from "storybook/preview-api";
import { ItemPreview } from "./ItemPreview.tsx";
function PreviewScreen({ itemId }) {
  const [, updateArgs] = useArgs();
  return _jsx(ItemPreview, { itemId: itemId, onItemId: (id) => updateArgs({ itemId: id }) });
}
const meta = {
  id: "ui-itempreview",
  title: "UI/ItemPreview",
  component: PreviewScreen,
  parameters: { layout: "fullscreen" },
  args: { itemId: "" },
};
export default meta;
export const Preview = {};
