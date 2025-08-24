import type { ReactNode } from "react";

interface DataOverlayProps {
	children: ReactNode;
	isLiveData: boolean;
	dataSource?: string;
	className?: string;
}

export default function DataOverlay({ 
	children, 
	isLiveData, 
	dataSource,
	className = "" 
}: DataOverlayProps) {
	if (isLiveData) {
		return <>{children}</>;
	}

	return (
		<div className={`relative ${className}`}>
			{children}
			<div className="absolute inset-0 bg-gray-400 bg-opacity-15 flex items-center justify-center z-10 pointer-events-none">
				<div className="bg-gray-800 bg-opacity-80 text-white px-2 py-1 rounded text-xs font-medium">
					<div className="flex items-center space-x-1">
						<span className="text-yellow-400">⚠️</span>
						<span>
							{dataSource === 'enhanced_calculation' 
								? 'Mock Data' 
								: dataSource === 'error'
								? 'Data Error'
								: 'Demo Data'
							}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
